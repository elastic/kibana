/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { PLUGIN_ID, UI_SETTINGS_CUSTOM_PDF_LOGO } from '../common/constants';
import { ReportingCore } from './';
import { initializeBrowserDriverFactory } from './browsers';
import { buildConfig, ReportingConfigType } from './config';
import { createQueueFactory, LevelLogger, ReportingStore } from './lib';
import { registerRoutes } from './routes';
import { setFieldFormats } from './services';
import { ReportingSetup, ReportingSetupDeps, ReportingStart, ReportingStartDeps } from './types';
import { registerReportingUsageCollector } from './usage';

const kbToBase64Length = (kb: number) => Math.floor((kb * 1024 * 8) / 6);

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
    this.reportingCore = new ReportingCore(this.logger);
  }

  public setup(core: CoreSetup, plugins: ReportingSetupDeps) {
    // prevent throwing errors in route handlers about async deps not being initialized
    core.http.registerRouteHandlerContext(PLUGIN_ID, () => {
      if (this.reportingCore.pluginIsStarted()) {
        return {}; // ReportingStart contract
      } else {
        return null;
      }
    });

    core.uiSettings.register({
      [UI_SETTINGS_CUSTOM_PDF_LOGO]: {
        name: i18n.translate('xpack.reporting.pdfFooterImageLabel', {
          defaultMessage: 'PDF footer image',
        }),
        value: null,
        description: i18n.translate('xpack.reporting.pdfFooterImageDescription', {
          defaultMessage: `Custom image to use in the PDF's footer`,
        }),
        type: 'image',
        schema: schema.nullable(schema.byteSize({ max: '200kb' })),
        category: [PLUGIN_ID],
        // Used client-side for size validation
        validation: {
          maxSize: {
            length: kbToBase64Length(200),
            description: '200 kB',
          },
        },
      },
    });

    const { elasticsearch, http } = core;
    const { features, licensing, security, spaces } = plugins;
    const { initializerContext: initContext, reportingCore } = this;

    const router = http.createRouter();
    const basePath = http.basePath;

    reportingCore.pluginSetup({
      features,
      elasticsearch,
      licensing,
      basePath,
      router,
      security,
      spaces,
    });

    registerReportingUsageCollector(reportingCore, plugins);
    registerRoutes(reportingCore, this.logger);

    // async background setup
    (async () => {
      const config = await buildConfig(initContext, core, this.logger);
      reportingCore.setConfig(config);
      // Feature registration relies on config, so it cannot be setup before here.
      reportingCore.registerFeature();
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

    // async background start
    (async () => {
      await this.reportingCore.pluginSetsUp();
      const config = reportingCore.getConfig();

      const browserDriverFactory = await initializeBrowserDriverFactory(config, logger);
      const store = new ReportingStore(reportingCore, logger);
      const esqueue = await createQueueFactory(reportingCore, store, logger); // starts polling for pending jobs

      reportingCore.pluginStart({
        browserDriverFactory,
        savedObjects: core.savedObjects,
        uiSettings: core.uiSettings,
        esqueue,
        store,
      });

      this.logger.debug('Start complete');
    })().catch((e) => {
      this.logger.error(`Error in Reporting start, reporting may not function properly`);
      this.logger.error(e);
    });

    return {};
  }
}
