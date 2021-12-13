/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from 'kibana/server';
import { coreMock } from 'src/core/server/mocks';
import { ReportingInternalStart } from './core';
import { ReportingPlugin } from './plugin';
import { createMockConfigSchema, createMockPluginSetup } from './test_helpers';
import {
  createMockPluginStart,
  createMockReportingCore,
} from './test_helpers/create_mock_reportingplugin';
import { ReportingSetupDeps } from './types';

const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

describe('Reporting Plugin', () => {
  let configSchema: any;
  let initContext: any;
  let coreSetup: CoreSetup;
  let coreStart: CoreStart;
  let pluginSetup: ReportingSetupDeps;
  let pluginStart: ReportingInternalStart;

  beforeEach(async () => {
    const reportingCore = await createMockReportingCore(createMockConfigSchema());
    configSchema = createMockConfigSchema();
    initContext = coreMock.createPluginInitializerContext(configSchema);
    coreSetup = coreMock.createSetup(configSchema);
    coreStart = coreMock.createStart();
    pluginSetup = createMockPluginSetup({}) as unknown as ReportingSetupDeps;
    pluginStart = createMockPluginStart(reportingCore, {});
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
    expect((coreSetup.uiSettings.register as jest.Mock).mock.calls[0][0]).toHaveProperty(
      'xpackReporting:customPdfLogo'
    );
  });

  it('logs start issues', async () => {
    const plugin = new ReportingPlugin(initContext);
    (plugin as unknown as { logger: { error: jest.Mock } }).logger.error = jest.fn();
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
