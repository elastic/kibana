import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import { ReportingExportTypesPluginSetup, ReportingExportTypesPluginStart } from './types';
import { defineRoutes } from './routes';

export class ReportingExportTypesPlugin
  implements Plugin<ReportingExportTypesPluginSetup, ReportingExportTypesPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('reportingExportTypes: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('reportingExportTypes: Started');
    return {};
  }

  public stop() {}
}
