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
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Generating a random key for xpack.reporting.encryptionKey. To prevent sessions from being invalidated on restart, please set xpack.reporting.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
    );
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
    expect(mockLogger.warn).not.toHaveBeenCalled();
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
    expect(mockLogger.warn).not.toHaveBeenCalled();
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
    expect(mockLogger.warn).not.toHaveBeenCalled();
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
    expect(mockLogger.warn).not.toHaveBeenCalled();
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
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it.each(['0', '0.0', '0.0.0', '0.0.0.0', '0000:0000:0000:0000:0000:0000:0000:0000', '::'])(
    `apply failover logic when hostname is given as "%s"`,
    async (hostname) => {
      mockInitContext = coreMock.createPluginInitializerContext(
        createMockConfigSchema({
          encryptionKey: 'aaaaaaaaaaaaabbbbbbbbbbbbaaaaaaaaa',
          // overwrite settings added by createMockConfigSchema and apply the default settings
          // TODO make createMockConfigSchema _not_ default xpack.reporting.kibanaServer.hostname to 'localhost'
          kibanaServer: {
            hostname: undefined,
            port: undefined,
          },
        })
      );
      mockCoreSetup.http.getServerInfo = jest.fn(
        (): HttpServerInfo => ({
          name: 'cool server',
          hostname,
          port: 5601,
          protocol: 'http',
        })
      );

      const mockConfig$ = createMockConfig(mockInitContext);
      await expect(
        createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise()
      ).resolves.toHaveProperty(
        'kibanaServer',
        expect.objectContaining({
          hostname: 'localhost',
          port: 5601,
          protocol: 'http',
        })
      );
    }
  );
});
