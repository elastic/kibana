/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./browsers/install', () => ({
  installBrowser: jest.fn().mockImplementation(() => ({
    binaryPath$: {
      pipe: jest.fn().mockImplementation(() => ({
        toPromise: () => Promise.resolve(),
      })),
    },
  })),
}));

import { coreMock } from 'src/core/server/mocks';
import { ReportingPlugin } from './plugin';
import { createMockConfigSchema } from './test_helpers';

const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

describe('Reporting Plugin', () => {
  let configSchema: any;
  let initContext: any;
  let coreSetup: any;
  let coreStart: any;
  let pluginSetup: any;
  let pluginStart: any;

  beforeEach(async () => {
    configSchema = createMockConfigSchema();
    initContext = coreMock.createPluginInitializerContext(configSchema);
    coreSetup = await coreMock.createSetup(configSchema);
    coreStart = await coreMock.createStart();
    pluginSetup = ({
      licensing: {},
      usageCollection: {
        makeUsageCollector: jest.fn(),
        registerCollector: jest.fn(),
      },
      security: {
        authc: {
          getCurrentUser: () => ({
            id: '123',
            roles: ['superuser'],
            username: 'Tom Riddle',
          }),
        },
      },
    } as unknown) as any;
    pluginStart = ({
      data: {
        fieldFormats: {},
      },
    } as unknown) as any;
  });

  it('has a sync setup process', () => {
    const plugin = new ReportingPlugin(initContext);

    expect(plugin.setup(coreSetup, pluginSetup)).not.toHaveProperty('then');
  });

  it('logs setup issues', async () => {
    initContext.config = null;
    const plugin = new ReportingPlugin(initContext);
    // @ts-ignore overloading error logger
    plugin.logger.error = jest.fn();
    plugin.setup(coreSetup, pluginSetup);

    await sleep(5);

    // @ts-ignore overloading error logger
    expect(plugin.logger.error.mock.calls[0][0]).toMatch(
      /Error in Reporting setup, reporting may not function properly/
    );
    // @ts-ignore overloading error logger
    expect(plugin.logger.error).toHaveBeenCalledTimes(2);
  });

  it('has a sync startup process', async () => {
    const plugin = new ReportingPlugin(initContext);
    plugin.setup(coreSetup, pluginSetup);
    await sleep(5);
    expect(plugin.start(coreStart, pluginStart)).not.toHaveProperty('then');
  });

  it('logs start issues', async () => {
    const plugin = new ReportingPlugin(initContext);
    // @ts-ignore overloading error logger
    plugin.logger.error = jest.fn();
    plugin.setup(coreSetup, pluginSetup);
    await sleep(5);
    plugin.start(null as any, pluginStart);
    await sleep(10);
    // @ts-ignore overloading error logger
    expect(plugin.logger.error.mock.calls[0][0]).toMatch(
      /Error in Reporting start, reporting may not function properly/
    );
    // @ts-ignore overloading error logger
    expect(plugin.logger.error).toHaveBeenCalledTimes(2);
  });
});
