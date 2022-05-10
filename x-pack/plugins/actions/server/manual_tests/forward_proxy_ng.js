/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// starts http and https proxies to use to test actions within Kibana

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const net = require('net');
const path = require('path');
const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');

const PROGRAM = path.basename(__filename).replace(/.js$/, '');

const HttpsOptions = {
  key: fs.readFileSync('packages/kbn-dev-utils/certs/kibana.key', 'utf8'),
  cert: fs.readFileSync('packages/kbn-dev-utils/certs/kibana.crt', 'utf8'),
};

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    help();
    process.exit(1);
  }

  const specs = args.map(argToSpec);
  for (const spec of specs) {
    const { protocol, port, auth } = spec;
    createServer(protocol, port, auth);
  }
}

/** @type { (protocol: string, port: number, auth: boolean) => Promise<http.Server | httpServer> } */
async function createServer(protocol, port, auth) {
  let httpServer;

  if (protocol === 'http') {
    httpServer = http.createServer(httpRequest);
  } else {
    httpServer = https.createServer(HttpsOptions, httpRequest);
  }

  const proxyOpts = {};

  if (auth) {
    proxyOpts.auth = 'elastic:mechange';
  }

  if (protocol === 'https') {
    proxyOpts.ssl = HttpsOptions;
  }

  const serverName = `${protocol}:${port}:${auth ? 'auth' : 'open'}`;
  const serverUrl = `${protocol}://${auth ? 'elastic:changeme@' : ''}localhost:${port}`;

  const proxy = httpProxy.createProxyServer(proxyOpts);

  proxy.on('error', (err, req, res) => {
    log(`${serverName}: error: ${err.message}\n${err.stack}`);
    res.end();
  });

  addExtraHttpsListeners(httpServer, serverUrl);

  httpServer.listen(port, 'localhost', () => {
    log(`${serverName}: started at ${serverUrl}`);
  });

  function httpRequest(req, res) {
    log(`${serverName}: request for: ${req.url}`);
    proxy.web(req, res, { target: req.url, secure: false });
  }
}

/** @type { (server: https.Server, name: string) => void } */
function addExtraHttpsListeners(server, serverName) {
  // see: https://stackoverflow.com/questions/8165570/https-proxy-server-in-node-js

  server.addListener('connect', function (req, socket, bodyhead) {
    const [host, port] = getHostPort(req.url);
    log(`${serverName}: proxy connect for: ${req.url}`);

    const proxySocket = new net.Socket();
    proxySocket.connect(port, host, () => {
      log(`${serverName}: proxy connected to: ${host}:${port}`);
      proxySocket.write(bodyhead);
      socket.write('HTTP/' + req.httpVersion + ' 200 Connection established\r\n\r\n');
    });

    proxySocket.on('data', (chunk) => {
      log(`${serverName}: proxy received data and sending on`);
      return socket.write(chunk);
    });
    proxySocket.on('end', () => {
      log(`${serverName}: proxy end`);
      socket.end();
    });
    proxySocket.on('error', (err) => {
      log(`${serverName}: proxy error: ${err.message}\n${err.stack}`);
      socket.write('HTTP/' + req.httpVersion + ' 500 Connection error\r\n\r\n');
      socket.end();
    });

    socket.on('data', (chunk) => {
      log(`${serverName}: target received data and sending on`);
      proxySocket.write(chunk);
    });
    socket.on('end', () => {
      log(`${serverName}: target end`);
      proxySocket.end();
    });
    socket.on('error', (err) => {
      log(`${serverName}: target error: ${err.message}\n${err.stack}`);
      proxySocket.end();
    });
  });
}

/** @type { (urlString: string) => [string, number] } */
function getHostPort(hostString) {
  const hostportRegex_ = /^([^:]+)(:([0-9]+))?$/;
  let host = hostString;
  let port = 443;

  const result = hostportRegex_.exec(hostString);
  if (result != null) {
    host = result[1];
    if (result[2] != null) {
      port = result[3];
    }
  }

  return [host, port];
}

/** @type { (arg: string) => void | { protocol: string, port: number, auth: boolean } } */
function argToSpec(arg) {
  const parts = arg.split('-');
  if (parts.length < 2) {
    return logError(`invalid spec: ${arg}`);
  }

  const [protocol, portString, authString] = parts;

  if (!protocol) return logError(`empty protocol in '${arg}'`);
  if (protocol !== 'http' && protocol !== 'https')
    return logError(`invalid protocol in '${arg}': '${protocol}'`);

  if (!portString) return logError(`empty port in '${arg}'`);
  const port = Number.parseInt(portString, 10);
  if (isNaN(port)) return logError(`invalid port in '${arg}': ${portString}`);

  let auth;
  if (!authString) {
    auth = false;
  } else {
    if (authString !== 'auth' && authString !== 'open')
      return logError(`invalid auth in '${arg}': '${authString}'`);
    auth = authString === 'auth';
  }

  return { protocol, port, auth };
}

/** @type { (message: string) => void } */
function log(message) {
  console.log(`${new Date().toISOString()} - ${message}`);
}

/** @type { (message: string) => void } */
function logError(message) {
  log(message);
  process.exit(1);
}

main();

/*
Test with:

node forward_proxy_ng.js http-8080-open https-8443-open

curl -k --no-alpn -o /dev/null --fail --proxy-insecure -x  http://127.0.0.1:8080  http://www.example.com; \
curl -k --no-alpn -o /dev/null --fail --proxy-insecure -x  http://127.0.0.1:8080 https://www.example.com; \
curl -k --no-alpn -o /dev/null --fail --proxy-insecure -x https://127.0.0.1:8443  http://www.example.com; \
curl -k --no-alpn -o /dev/null --fail --proxy-insecure -x https://127.0.0.1:8443 https://www.example.com; \
curl -k --no-alpn -o /dev/null --fail --proxy-insecure -x  http://127.0.0.1:8080 https://elastic:changeme@localhost:9200; \
curl -k --no-alpn -o /dev/null --fail --proxy-insecure -x https://127.0.0.1:8443 https://elastic:changeme@localhost:9200
*/

function help() {
  console.log(`${PROGRAM} - create http proxies to test connectors with`);
  console.log(`usage:`);
  console.log(`  ${PROGRAM} spec spec spec ...`);
  console.log(``);
  console.log(`options:`);
  console.log(``);
  console.log(`parameters:`);
  console.log(`  spec: spec is a 3-part token, separated by '-' chars`);
  console.log(`    [port]-[proto]-[auth]`);
  console.log(`      port  - port to open the proxy on`);
  console.log(`      proto - http or https`);
  console.log(`      auth  - auth or open (auth expects elastic:change)`);
  console.log(``);
  console.log(`example:`);
  console.log(`  ${PROGRAM} {options} 8080-http-open 8443-https-auth`);
  console.log(`  `);
}
