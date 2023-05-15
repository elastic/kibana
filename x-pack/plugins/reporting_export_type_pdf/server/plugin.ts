import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';

import { defineRoutes } from './routes';

export interface ReportingExportTypePdfPluginSetup {
  reporting: ReportingExportTypesSetup;
}

export interface ReportingExportTypePdfPluginStart {
  screenshotting: ScreenshottingStart;
}

export class ReportingExportTypePdfPlugin
  implements Plugin<ReportingExportTypePdfPluginSetup, ReportingExportTypePdfPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, { reporting }: ReportingExportTypePdfPluginSetup) {
    this.logger.debug('reportingExportTypePDF: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(_core: CoreStart, { screenshotting }: ReportingExportTypePdfPluginStart) {
    this.logger.debug('reportingExportTypePDF: Started');
    return {};
  }

  public stop() {}
}
