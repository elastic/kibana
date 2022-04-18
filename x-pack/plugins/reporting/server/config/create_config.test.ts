/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import type { CoreSetup, HttpServerInfo, Logger, PluginInitializerContext } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createMockConfigSchema } from '../test_helpers';
import type { ReportingConfigType } from '.';
import { createConfig$ } from './create_config';

const createMockConfig = (
  mockInitContext: PluginInitializerContext<unknown>
): Rx.Observable<ReportingConfigType> => mockInitContext.config.create();

describe('Reporting server createConfig$', () => {
  let mockCoreSetup: CoreSetup;
  let mockInitContext: PluginInitializerContext;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({ kibanaServer: {} })
    );
    mockLogger = loggingSystemMock.createLogger();
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
    const result = await Rx.lastValueFrom(createConfig$(mockCoreSetup, mockConfig$, mockLogger));

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
    const result = await Rx.lastValueFrom(createConfig$(mockCoreSetup, mockConfig$, mockLogger));
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
          "loadDelay": 1,
          "maxAttempts": 1,
          "timeouts": Object {
            "openUrl": 100,
            "renderComplete": 100,
            "waitForElements": 100,
          },
          "zoom": 1,
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
