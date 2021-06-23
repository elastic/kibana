/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { coreMock } from 'src/core/server/mocks';
import { LevelLogger } from '../lib';
import { createMockConfigSchema } from '../test_helpers';
import { createConfig$ } from './create_config';

describe('Reporting server createConfig$', () => {
  let mockCoreSetup: CoreSetup;
  let mockInitContext: PluginInitializerContext;
  let mockLogger: LevelLogger;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({ kibanaServer: {} })
    );
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
    mockInitContext = coreMock.createPluginInitializerContext({
      ...createMockConfigSchema({ kibanaServer: {} }),
      encryptionKey: undefined,
    });
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.encryptionKey).toMatch(/\S{32,}/); // random 32 characters
    expect(result.kibanaServer).toMatchInlineSnapshot(`
      Object {
        "hostname": "localhost",
        "port": 80,
        "protocol": "http",
      }
    `);
    expect((mockLogger.warn as any).mock.calls.length).toBe(1);
    expect((mockLogger.warn as any).mock.calls[0]).toMatchObject([
      'Generating a random key for xpack.reporting.encryptionKey. To prevent sessions from being invalidated on restart, please set xpack.reporting.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.',
    ]);
  });

  it('uses the user-provided encryption key', async () => {
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({
        encryptionKey: 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
      })
    );
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();
    expect(result.encryptionKey).toMatch('iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii');
    expect((mockLogger.warn as any).mock.calls.length).toBe(0);
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
    const mockConfig$: any = mockInitContext.config.create();
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
    expect((mockLogger.warn as any).mock.calls.length).toBe(0);
  });

  it('uses user-provided disableSandbox: false', async () => {
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({
        encryptionKey: '888888888888888888888888888888888',
        capture: { browser: { chromium: { disableSandbox: false } } },
      })
    );
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.capture.browser.chromium).toMatchObject({ disableSandbox: false });
    expect((mockLogger.warn as any).mock.calls.length).toBe(0);
  });

  it('uses user-provided disableSandbox: true', async () => {
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({
        encryptionKey: '888888888888888888888888888888888',
        capture: { browser: { chromium: { disableSandbox: true } } },
      })
    );
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.capture.browser.chromium).toMatchObject({ disableSandbox: true });
    expect((mockLogger.warn as any).mock.calls.length).toBe(0);
  });

  it('provides a default for disableSandbox', async () => {
    mockInitContext = coreMock.createPluginInitializerContext(
      createMockConfigSchema({
        encryptionKey: '888888888888888888888888888888888',
      })
    );
    const mockConfig$: any = mockInitContext.config.create();
    const result = await createConfig$(mockCoreSetup, mockConfig$, mockLogger).toPromise();

    expect(result.capture.browser.chromium).toMatchObject({ disableSandbox: expect.any(Boolean) });
    expect((mockLogger.warn as any).mock.calls.length).toBe(0);
  });
});
