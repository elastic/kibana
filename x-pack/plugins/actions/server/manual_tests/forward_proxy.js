/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
This module implements two forward http proxies, http on 8080 and https on 8443,
which can be used with the config xpack.actions.proxyUrl to emulate customers
using forward proxies with Kibana actions.  You can use either the http or https
versions, both can forward proxy http and https traffic: 
  
    xpack.actions.proxyUrl: http://localhost:8080
      OR
    xpack.actions.proxyUrl: https://localhost:8443

When using the https-based version, you may need to set the following option
as well:

    xpack.actions.rejectUnauthorized: false

If the server you are connecting to via the proxy is https and has self-signed
certificates, you'll also need to set

    xpack.actions.proxyRejectUnauthorizedCertificates: false
*/

const HTTP_PORT = 8080;
const HTTPS_PORT = 8443;

// starts http and https proxies to use to test actions within Kibana

const fs = require('fs');
const net = require('net');
const url = require('url');
const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');

const httpsOptions = {
  key: fs.readFileSync('packages/kbn-dev-utils/certs/kibana.key', 'utf8'),
  cert: fs.readFileSync('packages/kbn-dev-utils/certs/kibana.crt', 'utf8'),
};

const proxy = httpProxy.createServer();

createServer('http', HTTP_PORT);
createServer('https', HTTPS_PORT);

function createServer(protocol, port) {
  let httpServer;

  if (protocol === 'http') {
    httpServer = http.createServer();
  } else {
    httpServer = https.createServer(httpsOptions);
  }

  httpServer.on('request', httpRequest);
  httpServer.on('connect', httpsRequest);
  httpServer.listen(port);
  log(`proxy server started: ${protocol}:/localhost:${port}`);

  // handle http requests
  function httpRequest(req, res) {
    log(`${protocol} server: request for: ${req.url}`);
    const parsedUrl = url.parse(req.url);
    if (parsedUrl.hostname == null) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('this is a proxy server');
      return;
    }
    const target = parsedUrl.protocol + '//' + parsedUrl.hostname;
    proxy.web(req, res, { target: target, secure: false });
  }

  // handle https requests
  // see: https://nodejs.org/dist/latest-v14.x/docs/api/http.html#http_event_connect
  function httpsRequest(req, socket, head) {
    log(`${protocol} proxy server: request for target: https://${req.url}`);
    const serverUrl = url.parse('https://' + req.url);
    const serverSocket = net.connect(serverUrl.port, serverUrl.hostname, () => {
      socket.write('HTTP/1.1 200 Connection Established\r\nProxy-agent: Node-Proxy\r\n\r\n');
      serverSocket.write(head);
      serverSocket.pipe(socket);
      socket.pipe(serverSocket);
    });
    socket.on('error', (err) => {
      log(`error on socket to proxy: ${err}`);
      socket.destroy();
      serverSocket.destroy();
    });
    serverSocket.on('error', (err) => {
      log(`error on socket to target: ${err}`);
      socket.destroy();
      serverSocket.destroy();
    });
  }
}

function log(message) {
  console.log(`${new Date().toISOString()} - ${message}`);
}

/*
Test with:

curl -v -k --proxy-insecure -x  http://127.0.0.1:8080  http://www.google.com
curl -v -k --proxy-insecure -x  http://127.0.0.1:8080 https://www.google.com
curl -v -k --proxy-insecure -x https://127.0.0.1:8443  http://www.google.com
curl -v -k --proxy-insecure -x https://127.0.0.1:8443 https://www.google.com
*/
