/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { PLUGIN_ID } from '@kbn/reporting-common';
import type { ReportingConfigType } from '@kbn/reporting-server';
import { setFieldFormats } from '@kbn/reporting-server';
import type { ContentCrud, GetStorageContextFn } from '@kbn/content-management-plugin/server';

import { ReportingCore } from '.';
import { registerUiSettings } from './config';
import { registerDeprecations } from './deprecations';
import { ReportingStore } from './lib';
import { registerRoutes } from './routes';
import type {
  ReportingSetup,
  ReportingSetupDeps,
  ReportingStart,
  ReportingStartDeps,
} from './types';
import { ReportingRequestHandlerContext } from './types';
import { registerReportingUsageCollector } from './usage';
import { ReportingStorage } from './content_management';

export interface ReportingContentManagement {
  crud: ContentCrud;
  getStorageCtx: GetStorageContextFn;
}

/*
 * @internal
 */
export class ReportingPlugin
  implements Plugin<ReportingSetup, ReportingStart, ReportingSetupDeps, ReportingStartDeps>
{
  private logger: Logger;
  private reportingCore?: ReportingCore;
  private contentManagement?: ReportingContentManagement;

  constructor(private initContext: PluginInitializerContext<ReportingConfigType>) {
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    const { http, status } = core;
    const reportingCore = new ReportingCore(core, this.logger, this.initContext);
    this.reportingCore = reportingCore;

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

    // Usage counter for reporting telemetry
    const usageCounter = plugins.usageCollection?.createUsageCounter(PLUGIN_ID);

    reportingCore.pluginSetup({
      logger: this.logger,
      status,
      basePath: http.basePath,
      router: http.createRouter<ReportingRequestHandlerContext>(),
      usageCounter,
      docLinks: core.docLinks,
      ...plugins,
    });

    registerUiSettings(core);
    registerDeprecations({ core, reportingCore });
    registerReportingUsageCollector(reportingCore, plugins.usageCollection);

    this.contentManagement = plugins.contentManagement.register({
      id: PLUGIN_ID,
      storage: new ReportingStorage({ logger: this.logger, reportingCore }),
      version: { latest: 1 },
      searchIndex: {
        parser: (data: any) => {
          return {
            title: data.body.payload.title,
            description: 'CSV report created from saved search',
          };
        },
      },
    });

    // Routes
    registerRoutes(reportingCore, this.logger);

    // async background setup
    (async () => {
      // Feature registration relies on config, so it cannot be setup before here.
      reportingCore.registerFeature();
      this.logger.debug('Setup complete');
    })().catch((e) => {
      this.logger.error(`Error in Reporting setup, reporting may not function properly`);
      this.logger.error(e);
    });

    return reportingCore.getContract();
  }

  public start(core: CoreStart, _plugins: ReportingStartDeps) {
    const { contentManagement, ...plugins } = _plugins;
    const { elasticsearch, savedObjects, uiSettings } = core;

    // use fieldFormats plugin for csv formats
    setFieldFormats(plugins.fieldFormats);
    const reportingCore = this.reportingCore!;

    // async background start
    (async () => {
      if (!this.contentManagement) {
        throw new Error('Setup is not complete, cannot start Reporting');
      }
      await reportingCore.pluginSetsUp();

      const logger = this.logger;
      const store = new ReportingStore(reportingCore, logger, this.contentManagement);

      await reportingCore.pluginStart({
        logger,
        esClient: elasticsearch.client,
        savedObjects,
        uiSettings,
        store,
        contentManagement: this.contentManagement,
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
