/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  CSV_REPORT_TYPE,
  CSV_REPORT_TYPE_V2,
  PDF_REPORT_TYPE,
  PDF_REPORT_TYPE_V2,
  PNG_REPORT_TYPE_V2,
} from '../common/constants';
import type { ReportingCore, ReportingInternalStart } from './core';
import { ExportTypesRegistry } from './lib/export_types_registry';
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
    jest.clearAllMocks();

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

  describe('config and export types registration', () => {
    jest.mock('./lib/export_types_registry');
    ExportTypesRegistry.prototype.getAll = jest.fn(() => []); // code breaks if getAll returns undefined
    let registerSpy: jest.SpyInstance;

    beforeEach(async () => {
      registerSpy = jest.spyOn(ExportTypesRegistry.prototype, 'register');
      pluginSetup = createMockPluginSetup({}) as unknown as ReportingSetupDeps;
      pluginStart = await createMockPluginStart(coreStart, configSchema);
      plugin = new ReportingPlugin(initContext);
    });

    it('expect all report types to be in registry', async () => {
      // check the spy function
      expect(registerSpy).toHaveBeenCalledTimes(5);
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: CSV_REPORT_TYPE }));
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: CSV_REPORT_TYPE_V2 }));
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: PDF_REPORT_TYPE }));
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: PDF_REPORT_TYPE_V2 }));
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: PNG_REPORT_TYPE_V2 }));
    });

    it('expect image report types not to be in registry if disabled', async () => {
      jest.clearAllMocks();

      configSchema = createMockConfigSchema({
        export_types: {
          csv: { enabled: true },
          pdf: { enabled: false },
          png: { enabled: false },
        },
      });

      initContext = coreMock.createPluginInitializerContext(configSchema);
      coreSetup = coreMock.createSetup(configSchema);
      coreStart = coreMock.createStart();
      pluginSetup = createMockPluginSetup({}) as unknown as ReportingSetupDeps;
      pluginStart = await createMockPluginStart(coreStart, configSchema);
      plugin = new ReportingPlugin(initContext);

      // check the spy function was called with CSV
      expect(registerSpy).toHaveBeenCalledTimes(2);
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: CSV_REPORT_TYPE }));
      expect(registerSpy).toHaveBeenCalledWith(expect.objectContaining({ id: CSV_REPORT_TYPE_V2 }));

      // check the spy function was NOT called with anything else
      expect(registerSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: PDF_REPORT_TYPE })
      );
      expect(registerSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: PDF_REPORT_TYPE_V2 })
      );
      expect(registerSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: PNG_REPORT_TYPE_V2 })
      );
    });
  });
});
