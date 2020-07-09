/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { ReportingCore } from './';
import { initializeBrowserDriverFactory } from './browsers';
import { buildConfig, ReportingConfigType } from './config';
import {
  createQueueFactory,
  enqueueJobFactory,
  LevelLogger,
  runValidations,
  ReportingStore,
} from './lib';
import { registerRoutes } from './routes';
import { setFieldFormats } from './services';
import { ReportingSetup, ReportingSetupDeps, ReportingStart, ReportingStartDeps } from './types';
import { registerReportingUsageCollector } from './usage';

declare module 'src/core/server' {
  interface RequestHandlerContext {
    reporting?: ReportingStart | null;
  }
}

export class ReportingPlugin
  implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps> {
  private readonly initializerContext: PluginInitializerContext<ReportingConfigType>;
  private logger: LevelLogger;
  private reportingCore: ReportingCore;

  constructor(context: PluginInitializerContext<ReportingConfigType>) {
    this.logger = new LevelLogger(context.logger.get());
    this.initializerContext = context;
    this.reportingCore = new ReportingCore();
  }

  public setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    // prevent throwing errors in route handlers about async deps not being initialized
    core.http.registerRouteHandlerContext('reporting', () => {
      if (this.reportingCore.pluginIsStarted()) {
        return {}; // ReportingStart contract
      } else {
        return null;
      }
    });

    const { elasticsearch, http } = core;
    const { licensing, security } = plugins;
    const { initializerContext: initContext, reportingCore } = this;

    const router = http.createRouter();
    const basePath = http.basePath.get;

    reportingCore.pluginSetup({
      elasticsearch,
      licensing,
      basePath,
      router,
      security,
    });

    registerReportingUsageCollector(reportingCore, plugins);
    registerRoutes(reportingCore, this.logger);

    // async background setup
    (async () => {
      const config = await buildConfig(initContext, core, this.logger);
      reportingCore.setConfig(config);
      this.logger.debug('Setup complete');
    })().catch((e) => {
      this.logger.error(`Error in Reporting setup, reporting may not function properly`);
      this.logger.error(e);
    });

    return {};
  }

  public start(core: CoreStart, plugins: ReportingStartDeps) {
    // use data plugin for csv formats
    setFieldFormats(plugins.data.fieldFormats);

    const { logger, reportingCore } = this;
    const { elasticsearch } = reportingCore.getPluginSetupDeps();

    // async background start
    (async () => {
      await this.reportingCore.pluginSetsUp();
      const config = reportingCore.getConfig();

      const browserDriverFactory = await initializeBrowserDriverFactory(config, logger);
      const store = new ReportingStore(reportingCore, logger);
      const esqueue = await createQueueFactory(reportingCore, store, logger); // starts polling for pending jobs
      const enqueueJob = enqueueJobFactory(reportingCore, store, logger); // called from generation routes

      reportingCore.pluginStart({
        browserDriverFactory,
        savedObjects: core.savedObjects,
        uiSettings: core.uiSettings,
        esqueue,
        enqueueJob,
        store,
      });

      // run self-check validations
      runValidations(config, elasticsearch, browserDriverFactory, this.logger);

      this.logger.debug('Start complete');
    })().catch((e) => {
      this.logger.error(`Error in Reporting start, reporting may not function properly`);
      this.logger.error(e);
    });

    return {};
  }
}
