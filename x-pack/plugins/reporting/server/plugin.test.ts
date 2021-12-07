/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from 'src/core/server/mocks';
import { featuresPluginMock } from '../../features/server/mocks';
import { TaskManagerSetupContract } from '../../task_manager/server';
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
    coreSetup = coreMock.createSetup(configSchema);
    coreStart = coreMock.createStart();
    pluginSetup = {
      licensing: {},
      features: featuresPluginMock.createSetup(),
      usageCollection: {
        makeUsageCollector: jest.fn(),
        registerCollector: jest.fn(),
      },
      taskManager: {
        registerTaskDefinitions: jest.fn(),
      } as unknown as TaskManagerSetupContract,
      security: {
        authc: {
          getCurrentUser: () => ({
            id: '123',
            roles: ['superuser'],
            username: 'Tom Riddle',
          }),
        },
      },
    } as unknown as any;
    pluginStart = {
      data: {
        fieldFormats: {},
      },
    } as unknown as any;
  });

  it('has a sync setup process', () => {
    const plugin = new ReportingPlugin(initContext);

    expect(plugin.setup(coreSetup, pluginSetup)).not.toHaveProperty('then');
  });

  it('has a sync startup process', async () => {
    const plugin = new ReportingPlugin(initContext);
    plugin.setup(coreSetup, pluginSetup);
    await sleep(5);
    expect(plugin.start(coreStart, pluginStart)).not.toHaveProperty('then');
  });

  it('registers an advanced setting for PDF logos', async () => {
    const plugin = new ReportingPlugin(initContext);
    plugin.setup(coreSetup, pluginSetup);
    expect(coreSetup.uiSettings.register).toHaveBeenCalled();
    expect(coreSetup.uiSettings.register.mock.calls[0][0]).toHaveProperty(
      'xpackReporting:customPdfLogo'
    );
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
