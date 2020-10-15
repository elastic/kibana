/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { LevelLogger } from '../lib';
import { createConfig$ } from './create_config';
import { ReportingConfigType } from './schema';

interface KibanaServer {
  hostname?: string;
  port?: number;
  protocol?: string;
}

const makeMockInitContext = (config: {
  capture?: Partial<ReportingConfigType['capture']>;
  encryptionKey?: string;
  kibanaServer: Partial<ReportingConfigType['kibanaServer']>;
}): PluginInitializerContext =>
  ({
    config: {
      create: () =>
        Rx.of({
          ...config,
          capture: config.capture || { browser: { chromium: { disableSandbox: false } } },
          kibanaServer: config.kibanaServer || {},
        }),
    },
  } as PluginInitializerContext);

const makeMockCoreSetup = (serverInfo: KibanaServer): CoreSetup =>
  ({ http: { getServerInfo: () => serverInfo } } as any);

describe('Reporting server createConfig$', () => {
  let mockCoreSetup: CoreSetup;
  let mockInitContext: PluginInitializerContext;
  let mockLogger: LevelLogger;

  beforeEach(() => {
    mockCoreSetup = makeMockCoreSetup({ hostname: 'kibanaHost', port: 5601, protocol: 'http' });
    mockInitContext = makeMockInitContext({
      kibanaServer: {},
    });
    mockLogger = ({
      warn: jest.fn(),
      debug: jest.fn(),
      clone: jest.fn().mockImplementation(() => mockLogger),
    } as unknown) as LevelLogger;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates random encryption key and default config using host, protocol, and port from server info', async () => {
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.encryptionKey).toMatch(/\S{32,}/); // random 32 characters
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

  it('uses the user-provided encryption key', async () => {
    mockInitContext = makeMockInitContext({
      encryptionKey: 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
      kibanaServer: {},
    });
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();
    expect(result.encryptionKey).toMatch('iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii');
    expect((mockLogger.warn as any).mock.calls.length).toBe(0);
  });

  it('uses the user-provided encryption key, reporting kibanaServer settings to override server info', async () => {
    mockInitContext = makeMockInitContext({
      encryptionKey: 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
      kibanaServer: {
        hostname: 'reportingHost',
        port: 5677,
        protocol: 'httpsa',
      },
    });
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result).toMatchInlineSnapshot(`
      Object {
        "capture": Object {
          "browser": Object {
            "chromium": Object {
              "disableSandbox": false,
            },
          },
        },
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
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.kibanaServer).toMatchInlineSnapshot(`
      Object {
        "hostname": "0.0.0.0",
        "port": 5601,
        "protocol": "http",
      }
    `);
    expect((mockLogger.warn as any).mock.calls.length).toBe(1);
    expect((mockLogger.warn as any).mock.calls[0]).toMatchObject([
      `Found 'server.host: \"0\"' in Kibana configuration. This is incompatible with Reporting. To enable Reporting to work, 'xpack.reporting.kibanaServer.hostname: 0.0.0.0' is being automatically ` +
        `to the configuration. You can change the setting to 'server.host: 0.0.0.0' or add 'xpack.reporting.kibanaServer.hostname: 0.0.0.0' in kibana.yml to prevent this message.`,
    ]);
  });

  it('uses user-provided disableSandbox: false', async () => {
    mockInitContext = makeMockInitContext({
      encryptionKey: '888888888888888888888888888888888',
      capture: { browser: { chromium: { disableSandbox: false } } },
    } as ReportingConfigType);
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.capture.browser.chromium).toMatchObject({ disableSandbox: false });
    expect((mockLogger.warn as any).mock.calls.length).toBe(0);
  });

  it('uses user-provided disableSandbox: true', async () => {
    mockInitContext = makeMockInitContext({
      encryptionKey: '888888888888888888888888888888888',
      capture: { browser: { chromium: { disableSandbox: true } } },
    } as ReportingConfigType);
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.capture.browser.chromium).toMatchObject({ disableSandbox: true });
    expect((mockLogger.warn as any).mock.calls.length).toBe(0);
  });

  it('provides a default for disableSandbox', async () => {
    mockInitContext = makeMockInitContext({
      encryptionKey: '888888888888888888888888888888888',
    } as ReportingConfigType);
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.capture.browser.chromium).toMatchObject({ disableSandbox: expect.any(Boolean) });
    expect((mockLogger.warn as any).mock.calls.length).toBe(0);
  });
});
