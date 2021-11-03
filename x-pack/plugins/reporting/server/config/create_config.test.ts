/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { CoreSetup, HttpServerInfo, PluginInitializerContext } from 'src/core/server';
import { coreMock } from 'src/core/server/mocks';
import { LevelLogger } from '../lib/level_logger';
import { createMockConfigSchema, createMockLevelLogger } from '../test_helpers';
import { ReportingConfigType } from './';
import { createConfig$ } from './create_config';

const createMockConfig = (
  mockInitContext: PluginInitializerContext<unknown>
): Rx.Observable<ReportingConfigType> => mockInitContext.config.create();

describe('Reporting server createConfig$', () => {
  let mockCoreSetup: CoreSetup;
  let mockInitContext: PluginInitializerContext;
  let mockLogger: jest.Mocked<LevelLogger>;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({ kibanaServer: {} })
    );
    mockLogger = createMockLevelLogger();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates random encryption key and default config using host, protocol, and port from server info', async () => {
    mockInitContext = coreMock.createPluginInitializerContext({
      ...createMockConfigSchema({ kibanaServer: {} }),
      encryptionKey: undefined,
    });
    const mockConfig$ = createMockConfig(mockInitContext);
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.encryptionKey).toMatch(/\S{32,}/); // random 32 characters
    expect(mockLogger.warn.mock.calls.length).toBe(1);
    expect(mockLogger.warn.mock.calls[0]).toMatchObject([
      'Generating a random key for xpack.reporting.encryptionKey. To prevent sessions from being invalidated on restart, please set xpack.reporting.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.',
    ]);
  });

  it('uses the user-provided encryption key', async () => {
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({
        encryptionKey: 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
      })
    );
    const mockConfig$ = createMockConfig(mockInitContext);
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();
    expect(result.encryptionKey).toMatch('iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii');
    expect(mockLogger.warn.mock.calls.length).toBe(0);
  });

  it('uses the user-provided encryption key, reporting kibanaServer settings to override server info', async () => {
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({
        encryptionKey: 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
        kibanaServer: {
          hostname: 'reportingHost',
          port: 5677,
          protocol: 'httpsa',
        },
      })
    );
    const mockConfig$ = createMockConfig(mockInitContext);
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result).toMatchInlineSnapshot(`
      Object {
        "capture": Object {
          "browser": Object {
            "chromium": Object {
              "disableSandbox": true,
            },
          },
        },
        "csv": Object {},
        "encryptionKey": "iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
        "index": ".reporting",
        "kibanaServer": Object {
          "hostname": "reportingHost",
          "port": 5677,
          "protocol": "httpsa",
        },
        "queue": Object {
          "indexInterval": "week",
          "pollEnabled": true,
          "pollInterval": 3000,
          "timeout": 120000,
        },
        "roles": Object {
          "enabled": false,
        },
      }
    `);
    expect(mockLogger.warn.mock.calls.length).toBe(0);
  });

  it('uses user-provided disableSandbox: false', async () => {
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({
        encryptionKey: '888888888888888888888888888888888',
        capture: { browser: { chromium: { disableSandbox: false } } },
      })
    );
    const mockConfig$ = createMockConfig(mockInitContext);
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.capture.browser.chromium).toMatchObject({ disableSandbox: false });
    expect(mockLogger.warn.mock.calls.length).toBe(0);
  });

  it('uses user-provided disableSandbox: true', async () => {
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({
        encryptionKey: '888888888888888888888888888888888',
        capture: { browser: { chromium: { disableSandbox: true } } },
      })
    );
    const mockConfig$ = createMockConfig(mockInitContext);
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.capture.browser.chromium).toMatchObject({ disableSandbox: true });
    expect(mockLogger.warn.mock.calls.length).toBe(0);
  });

  it('provides a default for disableSandbox', async () => {
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({
        encryptionKey: '888888888888888888888888888888888',
      })
    );
    const mockConfig$ = createMockConfig(mockInitContext);
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.capture.browser.chromium).toMatchObject({ disableSandbox: expect.any(Boolean) });
    expect(mockLogger.warn.mock.calls.length).toBe(0);
  });

  describe('prevent invalid server hostnames', () => {
    beforeEach(() => {
      mockInitContext = coreMock.createPluginInitializerContext(
        createMockConfigSchema({
          encryptionKey: 'aaaaaaaaaaaaabbbbbbbbbbbbaaaaaaaaa',
          kibanaServer: {
            hostname: undefined,
            port: undefined,
          }, // overwrite settings added by createMockConfigSchema and apply the default settings
        })
      );
    });

    it(`apply failover logic to use "localhost" when "server.host" is "0.0.0.0"`, async () => {
      mockCoreSetup.http.getServerInfo = jest.fn().mockImplementation(
        (): HttpServerInfo => ({
          name: 'cool server',
          hostname: '0.0.0.0',
          port: 5601,
          protocol: 'http',
        })
      );

      const mockConfig$ = createMockConfig(mockInitContext);
      const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

      expect(result.kibanaServer).toMatchInlineSnapshot(`
      Object {
        "hostname": "localhost",
        "port": 5601,
        "protocol": "http",
      }
    `);

      expect(mockLogger.warn.mock.calls.length).toBe(1);
      expect(mockLogger.warn.mock.calls[0]).toMatchObject([
        "Found 'server.host: \"0.0.0.0\"' in Kibana configuration. Reporting is not able to use this as the Kibana server hostname. To enable PNG/PDF Reporting to work, 'xpack.reporting.kibanaServer.hostname: localhost' is automatically set in the configuration. You can prevent this message by adding 'xpack.reporting.kibanaServer.hostname: localhost' in kibana.yml.",
      ]);
    });

    it(`apply failover logic when using a variation of the "0" address`, async () => {
      mockCoreSetup.http.getServerInfo = jest.fn().mockImplementation(
        (): HttpServerInfo => ({
          name: 'cool server',
          hostname: '0.0',
          port: 5601,
          protocol: 'http',
        })
      );

      const mockConfig$ = createMockConfig(mockInitContext);
      const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

      expect(result.kibanaServer).toMatchInlineSnapshot(`
      Object {
        "hostname": "localhost",
        "port": 5601,
        "protocol": "http",
      }
    `);

      expect(mockLogger.warn.mock.calls.length).toBe(1);
      expect(mockLogger.warn.mock.calls[0]).toMatchObject([
        "Found 'server.host: \"0.0.0.0\"' in Kibana configuration. Reporting is not able to use this as the Kibana server hostname. To enable PNG/PDF Reporting to work, 'xpack.reporting.kibanaServer.hostname: localhost' is automatically set in the configuration. You can prevent this message by adding 'xpack.reporting.kibanaServer.hostname: localhost' in kibana.yml.",
      ]);
    });
  });
});
