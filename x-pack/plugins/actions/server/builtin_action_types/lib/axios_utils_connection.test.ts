/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync as fsReadFileSync } from 'fs';
import { resolve as pathResolve, join as pathJoin } from 'path';
import tls from 'tls';
import net from 'net';
import http from 'http';
import https from 'https';
import httpProxy from 'http-proxy';
import axios from 'axios';
import { duration as momentDuration } from 'moment';
import { schema } from '@kbn/config-schema';
import getPort from 'get-port';

import { request } from './axios_utils';
import { ByteSizeValue } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createReadySignal } from '@kbn/event-log-plugin/server/lib/ready_signal';
import { ActionsConfig } from '../../config';
import {
  ActionsConfigurationUtilities,
  getActionsConfigurationUtilities,
} from '../../actions_config';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

const CERT_DIR = '../../../../../../../packages/kbn-dev-utils/certs';

const KB_CRT_FILE = pathResolve(__filename, pathJoin(CERT_DIR, 'kibana.crt'));
const KB_KEY_FILE = pathResolve(__filename, pathJoin(CERT_DIR, 'kibana.key'));
const CA_CRT_FILE = pathResolve(__filename, pathJoin(CERT_DIR, 'ca.crt'));

const KB_CRT = fsReadFileSync(KB_CRT_FILE, 'utf8');
const KB_KEY = fsReadFileSync(KB_KEY_FILE, 'utf8');
const CA_CRT = fsReadFileSync(CA_CRT_FILE, 'utf8');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AxiosDefaultsAadapter = require('axios/lib/adapters/http');

describe('axios connections', () => {
  let testServer: http.Server | https.Server | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let savedAxiosDefaultsAdapter: any;

  beforeEach(() => {
    // needed to prevent the dreaded Error: Cross origin http://localhost forbidden
    // see: https://github.com/axios/axios/issues/1754#issuecomment-572778305
    savedAxiosDefaultsAdapter = axios.defaults.adapter;
    axios.defaults.adapter = AxiosDefaultsAadapter;
  });

  afterEach(() => {
    axios.defaults.adapter = savedAxiosDefaultsAdapter;
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    testServer?.close();
    testServer = null;
  });

  describe.skip('http', () => {
    test('it works', async () => {
      const { url, server } = await createServer({ useHttps: false });
      testServer = server;

      const configurationUtilities = getACUfromConfig();
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
    });
  });

  describe.skip('https', () => {
    test('it fails with self-signed cert and no overrides', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig();
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it works with verificationMode "none" config', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        ssl: {
          verificationMode: 'none',
        },
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
    });

    test('it works with verificationMode "none" for custom host config', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { verificationMode: 'none' } }],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
    });

    test('it works with ca in custom host config', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: CA_CRT } }],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
    });

    test('it fails with incorrect ca in custom host config', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: KB_CRT } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it works with incorrect ca in custom host config but verificationMode "none"', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [
          {
            url,
            ssl: {
              certificateAuthoritiesData: CA_CRT,
              verificationMode: 'none',
            },
          },
        ],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
    });

    test('it works with incorrect ca in custom host config but verificationMode config "full"', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        ssl: {
          verificationMode: 'none',
        },
        customHostSettings: [
          {
            url,
            ssl: {
              certificateAuthoritiesData: CA_CRT,
            },
          },
        ],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
    });

    test('it fails with no matching custom host settings', async () => {
      const { url, server } = await createServer({ useHttps: true });
      const otherUrl = 'https://example.com';
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url: otherUrl, ssl: { verificationMode: 'none' } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it fails cleanly with a garbage CA 1', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: 'garbage' } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it fails cleanly with a garbage CA 2', async () => {
      const { url, server } = await createServer({ useHttps: true });
      testServer = server;

      const ca = '-----BEGIN CERTIFICATE-----\ngarbage\n-----END CERTIFICATE-----\n';
      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: ca } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });
  });

  describe(`proxy`, () => {
    for (const targetProto of ['https']) {
      for (const proxyProto of ['https']) {
        test(`target: ${targetProto}, proxy: ${proxyProto}`, async () => {
          await runProxyTest(targetProto, false, proxyProto, false);
        });
      }
    }
  });
});

const EvergreenHttpsUrl = 'https://www.elastic.co/';

async function runProxyTest(
  targetProto: string,
  targetAuth: boolean,
  proxyProto: string,
  proxyAuth: boolean
) {
  const proxyServer = await createProxy({
    useHttps: proxyProto === 'https',
  });

  const configurationUtilities = getACUfromConfig({
    proxyUrl: proxyServer.url,
    rejectUnauthorized: false,
    ssl: {
      verificationMode: 'none',
      proxyVerificationMode: 'none',
    },
  });

  const res = await request({ axios, url: EvergreenHttpsUrl, logger, configurationUtilities });
  expect(res.status).toBe(200);

  proxyServer.server.close();
  proxyServer.proxy?.close();

  proxyServer.server.unref();
}

const TlsOptions = {
  cert: KB_CRT,
  key: KB_KEY,
};

interface CreateServerOptions {
  useHttps: boolean;
  requireAuth?: boolean;
}

interface CreateServerResult {
  url: string;
  server: http.Server | https.Server;
}

async function createServer(options: CreateServerOptions): Promise<CreateServerResult> {
  const { useHttps, requireAuth = false } = options;
  const port = await getPort();
  const url = `http${useHttps ? 's' : ''}://${
    requireAuth ? 'elastic:changeme@' : ''
  }localhost:${port}`;

  function requestHandler(req: http.IncomingMessage, res: http.ServerResponse) {
    res.writeHead(200);
    res.end('http: just testing that a connection could be made');
  }

  let server: http.Server | https.Server;
  if (!useHttps) {
    server = http.createServer(requestHandler);
  } else {
    server = https.createServer(TlsOptions, requestHandler);
  }

  const readySignal = createReadySignal<CreateServerResult>();
  server.listen(port, 'localhost', () => {
    readySignal.signal({ url, server });
  });

  return readySignal.wait();
}

interface CreateProxyOptions {
  useHttps: boolean;
  requireAuth?: boolean;
}

interface CreateProxyResult {
  url: string;
  server: http.Server | https.Server;
  proxy: httpProxy | null;
}

async function createProxy(options: CreateProxyOptions): Promise<CreateProxyResult> {
  const { useHttps, requireAuth = false } = options;
  const port = await getPort();
  const url = getUrl(useHttps, requireAuth, port);
  let httpServer: http.Server | https.Server;

  function requestHandler(req: http.IncomingMessage, res: http.ServerResponse) {
    proxy.web(req, res, { forward: req.url, secure: false });
  }

  if (!useHttps) {
    httpServer = http.createServer(requestHandler);
  } else {
    httpServer = https.createServer(TlsOptions, requestHandler);
  }

  const proxyOpts: httpProxy.ServerOptions = { secure: false };

  if (requireAuth) {
    proxyOpts.auth = 'elastic:changeme';
  }

  if (useHttps) {
    proxyOpts.ssl = TlsOptions;
  }

  const proxy = httpProxy.createProxyServer(proxyOpts);

  proxy.on('error', (err, req, res) => {
    res.end();
  });

  // addExtraConnectListeners(httpServer, url);

  const readySignal = createReadySignal<CreateProxyResult>();

  httpServer.listen(port, 'localhost', () => {
    readySignal.signal({ server: httpServer, proxy, url });
  });

  return readySignal.wait();
}

function getUrl(useHttps: boolean, requiresAuth: boolean, port: number) {
  return `http${useHttps ? 's' : ''}://${requiresAuth ? 'elastic:changeme@' : ''}localhost:${port}`;
}
function addExtraConnectListeners(server: http.Server | https.Server, serverUrl: string) {
  // see: https://stackoverflow.com/questions/8165570/https-proxy-server-in-node-js

  server.addListener('connect', function (req, socket, bodyhead) {
    if (!req.url) {
      socket.end();
      return;
    }

    const [host, port] = getHostPort(req.url);
    const proxyRawSocket = new net.Socket();
    const portNumber = parseInt(port, 10);
    if (isNaN(portNumber)) throw new Error('non-numeric port');

    const proxySocket = new tls.TLSSocket(proxyRawSocket, {
      ALPNProtocols: ['http/1.1'],
      rejectUnauthorized: true,
    });

    const connectOptions = {
      host,
      port: portNumber,
      rejectUnauthorized: false,
      ALPNProtocols: ['http/1.1'],
    };
    proxySocket.connect(connectOptions, () => {
      proxySocket.write(bodyhead);
      socket.write('HTTP/' + req.httpVersion + ' 200 Connection established\r\n\r\n');
    });

    proxySocket.on('data', (chunk) => socket.write(chunk));
    proxySocket.on('end', () => socket.end());
    proxySocket.on('error', (err) => {
      socket.write('HTTP/' + req.httpVersion + ' 500 Connection error\r\n\r\n');
      socket.end();
    });

    socket.on('data', (chunk) => proxySocket.write(chunk));
    socket.on('end', () => proxySocket.end());
    socket.on('error', (err) => {
      proxySocket.end();
    });
  });
}

function getHostPort(hostString: string) {
  const hostportRegex_ = /^([^:]+)(:([0-9]+))?$/;
  let host = hostString;
  let port = '443';

  const result = hostportRegex_.exec(hostString);
  if (result != null) {
    host = result[1];
    if (result[2] != null) {
      port = result[3];
    }
  }

  return [host, port];
}

const BaseActionsConfig: ActionsConfig = {
  allowedHosts: ['*'],
  enabledActionTypes: ['*'],
  preconfiguredAlertHistoryEsIndex: false,
  preconfigured: {},
  proxyUrl: undefined,
  proxyHeaders: undefined,
  proxyRejectUnauthorizedCertificates: true,
  ssl: {
    proxyVerificationMode: 'full',
    verificationMode: 'full',
  },
  proxyBypassHosts: undefined,
  proxyOnlyHosts: undefined,
  rejectUnauthorized: true,
  maxResponseContentLength: ByteSizeValue.parse('1mb'),
  responseTimeout: momentDuration(1000 * 30),
  customHostSettings: undefined,
  cleanupFailedExecutionsTask: {
    enabled: true,
    cleanupInterval: schema.duration().validate('5m'),
    idleInterval: schema.duration().validate('1h'),
    pageSize: 100,
  },
};

function getACUfromConfig(config: Partial<ActionsConfig> = {}): ActionsConfigurationUtilities {
  return getActionsConfigurationUtilities({
    ...BaseActionsConfig,
    ...config,
  });
}
