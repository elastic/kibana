/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { CoreSetup, Logger, PluginInitializerContext } from '../../../../../src/core/server';
import { createConfig$ } from './';

interface KibanaServer {
  host?: string;
  port?: number;
  protocol?: string;
}
interface ReportingKibanaServer {
  hostname?: string;
  port?: number;
  protocol?: string;
}

const makeMockInitContext = (config: {
  encryptionKey?: string;
  kibanaServer: ReportingKibanaServer;
}): PluginInitializerContext =>
  ({
    config: { create: () => Rx.of(config) },
  } as PluginInitializerContext);

const makeMockCoreSetup = (serverInfo: KibanaServer): CoreSetup =>
  ({ http: { getServerInfo: () => serverInfo } } as any);

describe('Reporting server createConfig$', () => {
  let mockCoreSetup: CoreSetup;
  let mockInitContext: PluginInitializerContext;
  let mockLogger: Logger;

  beforeEach(() => {
    mockCoreSetup = makeMockCoreSetup({ host: 'kibanaHost', port: 5601, protocol: 'http' });
    mockInitContext = makeMockInitContext({
      kibanaServer: {},
    });
    mockLogger = ({ warn: jest.fn() } as unknown) as Logger;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates random encryption key and default config using host, protocol, and port from server info', async () => {
    const result = await createConfig$(mockCoreSetup, mockInitContext, mockLogger).toPromise();

    expect(result.encryptionKey).toMatch(/\S{32,}/);
    expect(result.kibanaServer).toMatchInlineSnapshot(`
      Object {
        "hostname": "kibanaHost",
        "port": 5601,
        "protocol": "http",
      }
    `);
    expect((mockLogger.warn as any).mock.calls.length).toBe(1);
    expect((mockLogger.warn as any).mock.calls[0]).toMatchObject([
      'Generating a random key for xpack.reporting.encryptionKey. To prevent sessions from being invalidated on restart, please set xpack.reporting.encryptionKey in kibana.yml',
    ]);
  });

  it('uses the encryption key', async () => {
    mockInitContext = makeMockInitContext({
      encryptionKey: 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
      kibanaServer: {},
    });
    const result = await createConfig$(mockCoreSetup, mockInitContext, mockLogger).toPromise();

    expect(result.encryptionKey).toMatch('iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii');
    expect((mockLogger.warn as any).mock.calls.length).toBe(0);
  });

  it('uses the encryption key, reporting kibanaServer settings to override server info', async () => {
    mockInitContext = makeMockInitContext({
      encryptionKey: 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
      kibanaServer: {
        hostname: 'reportingHost',
        port: 5677,
        protocol: 'httpsa',
      },
    });
    const result = await createConfig$(mockCoreSetup, mockInitContext, mockLogger).toPromise();

    expect(result).toMatchInlineSnapshot(`
      Object {
        "encryptionKey": "iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
        "kibanaServer": Object {
          "hostname": "reportingHost",
          "port": 5677,
          "protocol": "httpsa",
        },
      }
    `);
    expect((mockLogger.warn as any).mock.calls.length).toBe(0);
  });

  it('show warning when kibanaServer.hostName === "0"', async () => {
    mockInitContext = makeMockInitContext({
      encryptionKey: 'aaaaaaaaaaaaabbbbbbbbbbbbaaaaaaaaa',
      kibanaServer: { hostname: '0' },
    });
    const result = await createConfig$(mockCoreSetup, mockInitContext, mockLogger).toPromise();

    expect(result.kibanaServer).toMatchInlineSnapshot(`
      Object {
        "hostname": "0.0.0.0",
        "port": 5601,
        "protocol": "http",
      }
    `);
    expect((mockLogger.warn as any).mock.calls.length).toBe(1);
    expect((mockLogger.warn as any).mock.calls[0]).toMatchObject([
      `Found 'server.host: \"0\" in Kibana configuration. This is incompatible with Reporting. To enable Reporting to work, 'xpack.reporting.kibanaServer.hostname: 0.0.0.0' is being automatically ` +
        `to the configuration. You can change the setting to 'server.host: 0.0.0.0' or add 'xpack.reporting.kibanaServer.hostname: 0.0.0.0' in kibana.yml to prevent this message.`,
    ]);
  });
});
