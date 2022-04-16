/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync as fsReadFileSync } from 'fs';
import { resolve as pathResolve, join as pathJoin } from 'path';
import http from 'http';
import https from 'https';
import axios from 'axios';
import { duration as momentDuration } from 'moment';
import { schema } from '@kbn/config-schema';

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

const KIBANA_CRT_FILE = pathResolve(__filename, pathJoin(CERT_DIR, 'kibana.crt'));
const KIBANA_KEY_FILE = pathResolve(__filename, pathJoin(CERT_DIR, 'kibana.key'));
const CA_FILE = pathResolve(__filename, pathJoin(CERT_DIR, 'ca.crt'));

const KIBANA_KEY = fsReadFileSync(KIBANA_KEY_FILE, 'utf8');
const KIBANA_CRT = fsReadFileSync(KIBANA_CRT_FILE, 'utf8');
const CA = fsReadFileSync(CA_FILE, 'utf8');

describe('axios connections', () => {
  let testServer: http.Server | https.Server;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let savedAxiosDefaultsAdapter: any;

  beforeAll(() => {
    // needed to prevent the dreaded Error: Cross origin http://localhost forbidden
    // see: https://github.com/axios/axios/issues/1754#issuecomment-572778305
    savedAxiosDefaultsAdapter = axios.defaults.adapter;
    axios.defaults.adapter = require('axios/lib/adapters/http');
  });

  afterAll(() => {
    axios.defaults.adapter = savedAxiosDefaultsAdapter;
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    testServer.close();
  });

  describe('http', () => {
    test('it works', async () => {
      const { url, server } = await createServer();
      testServer = server;

      const configurationUtilities = getACUfromConfig();
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
    });
  });

  describe('https', () => {
    test('it fails with self-signed cert and no overrides', async () => {
      const { url, server } = await createServer(true);
      testServer = server;

      const configurationUtilities = getACUfromConfig();
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it works with verificationMode "none" config', async () => {
      const { url, server } = await createServer(true);
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
      const { url, server } = await createServer(true);
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { verificationMode: 'none' } }],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
    });

    test('it works with ca in custom host config', async () => {
      const { url, server } = await createServer(true);
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: CA } }],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
    });

    test('it fails with incorrect ca in custom host config', async () => {
      const { url, server } = await createServer(true);
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: KIBANA_CRT } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it works with incorrect ca in custom host config but verificationMode "none"', async () => {
      const { url, server } = await createServer(true);
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [
          {
            url,
            ssl: {
              certificateAuthoritiesData: CA,
              verificationMode: 'none',
            },
          },
        ],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
    });

    test('it works with incorrect ca in custom host config but verificationMode config "full"', async () => {
      const { url, server } = await createServer(true);
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        ssl: {
          verificationMode: 'none',
        },
        customHostSettings: [
          {
            url,
            ssl: {
              certificateAuthoritiesData: CA,
            },
          },
        ],
      });
      const res = await request({ axios, url, logger, configurationUtilities });
      expect(res.status).toBe(200);
    });

    test('it fails with no matching custom host settings', async () => {
      const { url, server } = await createServer(true);
      const otherUrl = 'https://example.com';
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url: otherUrl, ssl: { verificationMode: 'none' } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it fails cleanly with a garbage CA 1', async () => {
      const { url, server } = await createServer(true);
      testServer = server;

      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: 'garbage' } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });

    test('it fails cleanly with a garbage CA 2', async () => {
      const { url, server } = await createServer(true);
      testServer = server;

      const ca = '-----BEGIN CERTIFICATE-----\ngarbage\n-----END CERTIFICATE-----\n';
      const configurationUtilities = getACUfromConfig({
        customHostSettings: [{ url, ssl: { certificateAuthoritiesData: ca } }],
      });
      const fn = async () => await request({ axios, url, logger, configurationUtilities });
      await expect(fn()).rejects.toThrow('certificate');
    });
  });
});

interface CreateServerResult {
  url: string;
  server: http.Server | https.Server;
}

async function createServer(useHttps: boolean = false): Promise<CreateServerResult> {
  let server: http.Server | https.Server;
  const readySignal = createReadySignal<CreateServerResult>();

  if (!useHttps) {
    server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('http: just testing that a connection could be made');
    });
  } else {
    const httpsOptions = {
      cert: KIBANA_CRT,
      key: KIBANA_KEY,
    };
    server = https.createServer(httpsOptions, (req, res) => {
      res.writeHead(200);
      res.end('https: just testing that a connection could be made');
    });
  }

  server.listen(() => {
    const addressInfo = server.address();
    if (addressInfo == null || typeof addressInfo === 'string') {
      server.close();
      throw new Error('error getting address of server, closing');
    }

    const url = localUrlFromPort(useHttps, addressInfo.port, 'localhost');
    readySignal.signal({ server, url });
  });

  // let the node process stop if for some reason this server isn't closed
  server.unref();

  return readySignal.wait();
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

function localUrlFromPort(useHttps: boolean, port: number, host: string): string {
  return `${useHttps ? 'https' : 'http'}://${host}:${port}`;
}
