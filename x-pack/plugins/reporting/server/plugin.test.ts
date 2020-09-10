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
import { DataPluginStart } from 'src/plugins/data/server/plugin';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { featuresPluginMock } from '../../features/server/mocks';
import { LicensingPluginSetup } from '../../licensing/server';
import { SecurityPluginSetup } from '../../security/server';
import { ReportingPlugin } from './plugin';
import { createMockConfigSchema } from './test_helpers';
import { ReportingSetupDeps, ReportingStartDeps } from './types';

const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

describe('Reporting Plugin', () => {
  let configSchema: any;
  let initContext: any;
  let coreSetup: any;
  let coreStart: any;
  let pluginSetup: ReportingSetupDeps;
  let pluginStart: ReportingStartDeps;

  beforeEach(async () => {
    configSchema = createMockConfigSchema();
    initContext = coreMock.createPluginInitializerContext(configSchema);
    coreSetup = coreMock.createSetup(configSchema);
    coreStart = coreMock.createStart();

    pluginSetup = {
      licensing: {} as LicensingPluginSetup,
      features: featuresPluginMock.createSetup(),
      usageCollection: ({
        makeUsageCollector: jest.fn(),
        registerCollector: jest.fn(),
      } as unknown) as UsageCollectionSetup,
      security: ({
        authc: {
          getCurrentUser: () => ({
            id: '123',
            roles: ['superuser'],
            username: 'Tom Riddle',
          }),
        },
      } as unknown) as SecurityPluginSetup,
    };

    pluginStart = {
      data: { fieldFormats: {} } as DataPluginStart,
    } as ReportingStartDeps;
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
