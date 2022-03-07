/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Logger } from 'kibana/server';
import { coreMock, loggingSystemMock } from 'src/core/server/mocks';
import type { ReportingCore, ReportingInternalStart } from './core';
import { ReportingPlugin } from './plugin';
import {
  createMockConfigSchema,
  createMockPluginSetup,
  createMockPluginStart,
} from './test_helpers';
import type { ReportingSetupDeps } from './types';

const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

describe('Reporting Plugin', () => {
  let configSchema: any;
  let initContext: any;
  let coreSetup: CoreSetup;
  let coreStart: CoreStart;
  let pluginSetup: ReportingSetupDeps;
  let pluginStart: ReportingInternalStart;
  let logger: jest.Mocked<Logger>;
  let plugin: ReportingPlugin;

  beforeEach(async () => {
    configSchema = createMockConfigSchema();
    initContext = coreMock.createPluginInitializerContext(configSchema);
    coreSetup = coreMock.createSetup(configSchema);
    coreStart = coreMock.createStart();
    pluginSetup = createMockPluginSetup({}) as unknown as ReportingSetupDeps;
    pluginStart = await createMockPluginStart(coreStart, configSchema);

    logger = loggingSystemMock.createLogger();
    plugin = new ReportingPlugin(initContext);
    (plugin as unknown as { logger: Logger }).logger = logger;
  });

  it('has a sync setup process', () => {
    expect(plugin.setup(coreSetup, pluginSetup)).not.toHaveProperty('then');
  });

  it('has a sync startup process', async () => {
    plugin.setup(coreSetup, pluginSetup);
    await sleep(5);
    expect(plugin.start(coreStart, pluginStart)).not.toHaveProperty('then');
  });

  it('registers an advanced setting for PDF logos', async () => {
    plugin.setup(coreSetup, pluginSetup);
    expect(coreSetup.uiSettings.register).toHaveBeenCalled();
    expect((coreSetup.uiSettings.register as jest.Mock).mock.calls[0][0]).toHaveProperty(
      'xpackReporting:customPdfLogo'
    );
  });

  it('logs start issues', async () => {
    // wait for the setup phase background work
    plugin.setup(coreSetup, pluginSetup);
    await new Promise(setImmediate);

    // create a way for an error to happen
    const reportingCore = (plugin as unknown as { reportingCore: ReportingCore }).reportingCore;
    reportingCore.pluginStart = jest.fn().mockRejectedValueOnce('silly');

    // wait for the startup phase background work
    plugin.start(coreStart, pluginStart);
    await new Promise(setImmediate);

    expect(logger.error.mock.calls.map(([message]) => message)).toMatchInlineSnapshot(`
      Array [
        "Error in Reporting start, reporting may not function properly",
        "silly",
      ]
    `);
    expect(logger.error).toHaveBeenCalledTimes(2);
  });
});
