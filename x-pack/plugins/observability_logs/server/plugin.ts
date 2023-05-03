import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../../src/core/server';

import { ObservabilityLogsPluginSetup, ObservabilityLogsPluginStart } from './types';
import { defineRoutes } from './routes';

export class ObservabilityLogsPlugin
  implements Plugin<ObservabilityLogsPluginSetup, ObservabilityLogsPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('observabilityLogs: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('observabilityLogs: Started');
    return {};
  }

  public stop() {}
}
