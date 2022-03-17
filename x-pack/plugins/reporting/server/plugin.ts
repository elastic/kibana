/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import { PLUGIN_ID } from '../common/constants';
import { ReportingCore } from './';
import { buildConfig, registerUiSettings, ReportingConfigType } from './config';
import { registerDeprecations } from './deprecations';
import { ReportingStore } from './lib';
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

/*
 * @internal
 */
export class ReportingPlugin
  implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps>
{
  private logger: Logger;
  private reportingCore?: ReportingCore;

  constructor(private initContext: PluginInitializerContext<ReportingConfigType>) {
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    const { http, status } = core;
    const reportingCore = new ReportingCore(this.logger, this.initContext);

    // prevent throwing errors in route handlers about async deps not being initialized
    // @ts-expect-error null is not assignable to object. use a boolean property to ensure reporting API is enabled.
    http.registerRouteHandlerContext(PLUGIN_ID, () => {
      if (reportingCore.pluginIsStarted()) {
        return reportingCore.getContract();
      } else {
        this.logger.error(`Reporting features are not yet ready`);
        return null;
      }
    });

    reportingCore.pluginSetup({
      logger: this.logger,
      status,
      basePath: http.basePath,
      router: http.createRouter<ReportingRequestHandlerContext>(),
      ...plugins,
    });

    registerUiSettings(core);
    registerDeprecations({ core, reportingCore });
    registerReportingUsageCollector(reportingCore, plugins.usageCollection);
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
    return reportingCore.getContract();
  }

  public start(core: CoreStart, plugins: ReportingStartDeps) {
    const { elasticsearch, savedObjects, uiSettings } = core;

    // use fieldFormats plugin for csv formats
    setFieldFormats(plugins.fieldFormats);
    const reportingCore = this.reportingCore!;

    // async background start
    (async () => {
      await reportingCore.pluginSetsUp();

      const logger = this.logger;
      const store = new ReportingStore(reportingCore, logger);

      await reportingCore.pluginStart({
        logger,
        esClient: elasticsearch.client,
        savedObjects,
        uiSettings,
        store,
        ...plugins,
      });

      // Note: this must be called after ReportingCore.pluginStart
      await store.start();

      this.logger.debug('Start complete');
    })().catch((e) => {
      this.logger.error(`Error in Reporting start, reporting may not function properly`);
      this.logger.error(e);
    });

    return reportingCore.getContract();
  }

  stop() {
    this.reportingCore?.pluginStop();
  }
}
