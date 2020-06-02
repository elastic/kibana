/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { ReportingCore } from './core';
import { ReportingConfigType } from './config';
import { createBrowserDriverFactory } from './browsers';
import { buildConfig, createConfig$ } from './config';
import { createQueueFactory, enqueueJobFactory, LevelLogger, runValidations } from './lib';
import { registerRoutes } from './routes';
import { setFieldFormats } from './services';
import { ReportingSetup, ReportingSetupDeps, ReportingStart, ReportingStartDeps } from './types';
import { registerReportingUsageCollector } from './usage';

export class ReportingPlugin
  implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps> {
  private readonly initializerContext: PluginInitializerContext<ReportingConfigType>;
  private logger: LevelLogger;
  private reportingCore: ReportingCore | null = null;
  private config$: Observable<ReportingConfigType>;

  constructor(context: PluginInitializerContext<ReportingConfigType>) {
    this.logger = new LevelLogger(context.logger.get('reporting'));
    this.initializerContext = context;
    this.config$ = context.config.create<ReportingConfigType>();
  }

  public async setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    const { elasticsearch, http } = core;
    const { licensing, security } = plugins;
    const { initializerContext: initContext } = this;
    const router = http.createRouter();
    const basePath = http.basePath.get;

    const coreConfig = await createConfig$(core, this.config$, this.logger)
      .pipe(first())
      .toPromise(); // apply computed defaults to config
    const reportingConfig = buildConfig(initContext, core, coreConfig); // combine kbnServer configs
    this.reportingCore = new ReportingCore(reportingConfig);

    const browserDriverFactory = await createBrowserDriverFactory(reportingConfig, this.logger);

    this.reportingCore.pluginSetup({
      browserDriverFactory,
      elasticsearch,
      licensing,
      basePath,
      router,
      security,
    });

    runValidations(reportingConfig, elasticsearch, browserDriverFactory, this.logger);
    registerReportingUsageCollector(this.reportingCore, plugins);
    registerRoutes(this.reportingCore, this.logger);

    return {};
  }

  public async start(core: CoreStart, plugins: ReportingStartDeps) {
    const { logger } = this;
    const reportingCore = this.getReportingCore();

    const esqueue = await createQueueFactory(reportingCore, logger);
    const enqueueJob = enqueueJobFactory(reportingCore, logger);

    reportingCore.pluginStart({
      savedObjects: core.savedObjects,
      uiSettings: core.uiSettings,
      esqueue,
      enqueueJob,
    });

    setFieldFormats(plugins.data.fieldFormats);
    logger.info('reporting plugin started');

    return {};
  }

  public getReportingCore() {
    if (!this.reportingCore) {
      throw new Error('Setup is not ready');
    }
    return this.reportingCore;
  }
}
