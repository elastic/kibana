/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { PLUGIN_ID } from '../common/constants';
import { ReportingCore } from './';
import { initializeBrowserDriverFactory } from './browsers';
import { buildConfig, registerUiSettings, ReportingConfigType } from './config';
import { LevelLogger, ReportingStore } from './lib';
import { registerRoutes } from './routes';
import { setFieldFormats } from './services';
import type {
  ReportingRequestHandlerContext,
  ReportingSetup,
  ReportingSetupDeps,
  ReportingStart,
  ReportingStartDeps,
} from './types';
import { registerReportingUsageCollector } from './usage';

export class ReportingPlugin
  implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps> {
  private logger: LevelLogger;
  private reportingCore?: ReportingCore;

  constructor(private initContext: PluginInitializerContext<ReportingConfigType>) {
    this.logger = new LevelLogger(initContext.logger.get());
  }

  public setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    const reportingCore = new ReportingCore(this.logger, this.initContext);

    // prevent throwing errors in route handlers about async deps not being initialized
    // @ts-expect-error null is not assignable to object. use a boolean property to ensure reporting API is enabled.
    core.http.registerRouteHandlerContext(PLUGIN_ID, () => {
      if (reportingCore.pluginIsStarted()) {
        return reportingCore.getStartContract();
      } else {
        this.logger.error(`Reporting features are not yet ready`);
        return null;
      }
    });

    registerUiSettings(core);

    const { http } = core;
    const { screenshotMode, features, licensing, security, spaces, taskManager } = plugins;

    const router = http.createRouter<ReportingRequestHandlerContext>();
    const basePath = http.basePath;

    reportingCore.pluginSetup({
      screenshotMode,
      features,
      licensing,
      basePath,
      router,
      security,
      spaces,
      taskManager,
      logger: this.logger,
    });

    registerReportingUsageCollector(reportingCore, plugins);
    registerRoutes(reportingCore, this.logger);

    // async background setup
    (async () => {
      const config = await buildConfig(this.initContext, core, this.logger);
      reportingCore.setConfig(config);
      // Feature registration relies on config, so it cannot be setup before here.
      reportingCore.registerFeature();
      this.logger.debug('Setup complete');
    })().catch((e) => {
      this.logger.error(`Error in Reporting setup, reporting may not function properly`);
      this.logger.error(e);
    });

    this.reportingCore = reportingCore;
    return reportingCore.getStartContract();
  }

  public start(core: CoreStart, plugins: ReportingStartDeps) {
    // use data plugin for csv formats
    setFieldFormats(plugins.data.fieldFormats);
    const reportingCore = this.reportingCore!;

    // async background start
    (async () => {
      await reportingCore.pluginSetsUp();

      const browserDriverFactory = await initializeBrowserDriverFactory(reportingCore, this.logger);
      const store = new ReportingStore(reportingCore, this.logger);

      await reportingCore.pluginStart({
        browserDriverFactory,
        savedObjects: core.savedObjects,
        uiSettings: core.uiSettings,
        store,
        esClient: core.elasticsearch.client,
        data: plugins.data,
        taskManager: plugins.taskManager,
        logger: this.logger,
      });

      this.logger.debug('Start complete');
    })().catch((e) => {
      this.logger.error(`Error in Reporting start, reporting may not function properly`);
      this.logger.error(e);
    });

    return reportingCore.getStartContract();
  }
}
