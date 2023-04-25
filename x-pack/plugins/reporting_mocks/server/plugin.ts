import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../../src/core/server';

import { ReportingMocksPluginSetup, ReportingMocksPluginStart } from './types';
import { defineRoutes } from './routes';

export class ReportingMocksPlugin
  implements Plugin<ReportingMocksPluginSetup, ReportingMocksPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('reportingMocks: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('reportingMocks: Started');
    return {};
  }

  public stop() {}
}
