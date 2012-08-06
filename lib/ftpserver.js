addToClasspath("../jars/mina-core-2.0.4.jar");
addToClasspath("../jars/ftplet-api-1.0.6.jar");
addToClasspath("../jars/ftpserver-core-1.0.6.jar");

var fs = require("fs");
var objects = require("ringo/utils/objects");
var {JsonUserManager} = require("./jsonusermanager");
var {FtpServerFactory} = org.apache.ftpserver;
var {ListenerFactory} = org.apache.ftpserver.listener;
var {DefaultIpFilter, IpFilterType} = org.apache.ftpserver.ipfilter;
var {UserManager, Ftplet, DefaultFtplet} = org.apache.ftpserver.ftplet;
var {LinkedHashMap} = java.util;
var {SslConfigurationFactory} = org.apache.ftpserver.ssl;

/**
 * Instances of this class represent an FtpServer based on Apache FtpServer
 * (http://mina.apache.org/ftpserver/)
 * @param {org.apache.ftpserver.listener.Listener} listener The listener to use
 * @param {org.apache.ftpserver.ftplet.UserManager} userManager The user manager
 * @returns A newly created FtpServer instance
 * @type FtpServer
 * @constructor
 */
var FtpServer = exports.FtpServer = function(listener, userManager) {

    var server = null;
    var serverFactory = new FtpServerFactory();
    var ftplets = new LinkedHashMap();

    Object.defineProperties(this, {
        /**
         * The wrapped server
         * @type org.apache.ftpserver.FtpServer
         */
        "server": {
            "get": function() {
                if (server === null) {
                    serverFactory.addListener("default", listener);
                    serverFactory.setUserManager(userManager);
                    serverFactory.setFtplets(ftplets);
                    server = serverFactory.createServer();
                }
                return server;
            },
            "enumerable": true
        },
        /**
         * A map containing the Ftplets used by this server
         * @type java.util.LinkedHashMap
         */
        "ftplets": {"value": ftplets, "enumerable": true}
    });

    return this;
};

/**
 * Adds the Ftplet to this server
 * @param {String} name The name of the Ftplet
 * @param {org.apache.ftpserver.ftplet.Ftplet} impl The Ftplet implementation
 */
FtpServer.prototype.addFtpLet = function(name, impl) {
    this.ftplets.put(name, new JavaAdapter(DefaultFtplet, impl));
};

/** @ignore */
FtpServer.prototype.toString = function() {
    return "[FtpServer]";
};

/**
 * Starts the server
 */
FtpServer.prototype.start = function() {
    this.server.start();
};

/**
 * Stops the server
 */
FtpServer.prototype.stop = function() {
    this.server.stop();
};

/**
 * Returns true if this server is stopped
 * @return {Boolean} True if this server is stopped, false otherwise
 */
FtpServer.prototype.isStopped = function() {
    return this.server.isStopped();
};

/**
 * Creates an SSL configuration
 *
 * ### Options
 *
 * - `keystore`: The path to the Java keystore containing the server certificate
 * - `password`: The passphrase of the Java keystore
 * - `protocol`: The encryption protocol to use (either `ssl` or `tls`, defaults to the latter)
 *
 * @param {Object} opts Options
 * @returns {org.apache.ftpserver.ssl.SslConfiguration} The SSL configuration object
 */
FtpServer.createSslConfig = function(opts) {

    var options = objects.merge(opts, {
        "keystore": null,
        "password": null,
        "protocol": "tls"
    });
    if (options.keystore == null || !fs.exists(options.keystore)) {
        throw new Error("Missing keystore");
    }
    var factory = new SslConfigurationFactory();
    factory.setKeystoreFile(new java.io.File(options.keystore));
    if (typeof(options.password) === "string" && options.password.length > 0) {
        factory.setKeystorePassword(options.password);
    }
    factory.setSslProtocol(options.protocol);
    return factory.createSslConfiguration();
};

/**
 * Creates a listener
 *
 * ### Options
 *
 * - `port`: The port to listen on (defaults to 21)
 * - `allow`: a comma, space, tab or LF separated list of IP addresses and/or CIDRs
 * - `sslConfig`: The SSL config to use
 * - `useImplicitSsl`: If boolean false this listener uses explicit SSL encryption (defaults to true)
 *
 * @param opts The options object
 * @returns {org.apache.ftpserver.listener.Listener} The listener
 * @see #createSslConfig
 */
FtpServer.createListener = function(opts) {

    var options = objects.merge(opts, {
        "port": 21,
        "allow": null,
        "sslConfig": null,
        "useImplicitSsl": true
    });

    var factory = new ListenerFactory();
    factory.setPort(options.port);
    if (options.allow) {
        factory.setIpFilter(new DefaultIpFilter(IpFilterType.ALLOW, options.allow));
    }
    if (options.sslConfig != undefined) {
        factory.setSslConfiguration(options.sslConfig);
        factory.setImplicitSsl(options.useImplicitSsl !== false);
    }
    return factory.createListener();
};

/**
 * Creates a new user manager
 * @param {String} file The path to the JSON file containing the user accounts
 * @returns {org.apache.ftpserver.usermanager.UserManager} The user manager
 */
FtpServer.createUserManager = function(file) {
    return new UserManager(new JsonUserManager(file));
};

