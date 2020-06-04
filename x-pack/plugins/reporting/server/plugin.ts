/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { ReportingCore } from './';
import { initializeBrowserDriverFactory } from './browsers';
import { buildConfig, ReportingConfigType } from './config';
import { createQueueFactory, enqueueJobFactory, LevelLogger, runValidations } from './lib';
import { registerRoutes } from './routes';
import { setFieldFormats } from './services';
import { ReportingSetup, ReportingSetupDeps, ReportingStart, ReportingStartDeps } from './types';
import { registerReportingUsageCollector } from './usage';

export class ReportingPlugin
  implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps> {
  private readonly initializerContext: PluginInitializerContext<ReportingConfigType>;
  private logger: LevelLogger;
  private reportingCore?: ReportingCore;

  constructor(context: PluginInitializerContext<ReportingConfigType>) {
    this.logger = new LevelLogger(context.logger.get());
    this.initializerContext = context;
  }

  public setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    const { elasticsearch, http } = core;
    const { licensing, security } = plugins;
    const { initializerContext: initContext } = this;
    const router = http.createRouter();
    const basePath = http.basePath.get;

    // async background setup
    buildConfig(initContext, core, this.logger).then((config) => {
      const reportingCore = new ReportingCore(config);

      reportingCore.pluginSetup({
        elasticsearch,
        licensing,
        basePath,
        router,
        security,
      });

      registerReportingUsageCollector(reportingCore, plugins);
      registerRoutes(reportingCore, this.logger);
      this.reportingCore = reportingCore;

      this.logger.debug('Setup complete');
    });

    return {};
  }

  public start(core: CoreStart, plugins: ReportingStartDeps) {
    // use data plugin for csv formats
    setFieldFormats(plugins.data.fieldFormats);

    const { logger } = this;
    const reportingCore = this.getReportingCore();
    const config = reportingCore.getConfig();
    const { elasticsearch } = reportingCore.getPluginSetupDeps();

    // async background start
    initializeBrowserDriverFactory(config, logger).then(async (browserDriverFactory) => {
      reportingCore.setBrowserDriverFactory(browserDriverFactory);

      const esqueue = await createQueueFactory(reportingCore, logger);
      const enqueueJob = enqueueJobFactory(reportingCore, logger);

      reportingCore.pluginStart({
        savedObjects: core.savedObjects,
        uiSettings: core.uiSettings,
        esqueue,
        enqueueJob,
      });

      // run self-check validations
      runValidations(config, elasticsearch, browserDriverFactory, this.logger);

      this.logger.debug('Start complete');
    });

    return {};
  }

  public getReportingCore() {
    if (!this.reportingCore) {
      throw new Error('Setup is not ready');
    }
    return this.reportingCore;
  }
}
