import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import { ExportTypePluginPluginSetup, ExportTypePluginPluginStart } from './types';
import { defineRoutes } from './routes';

export class ExportTypePluginPlugin
  implements Plugin<ExportTypePluginPluginSetup, ExportTypePluginPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('exportTypePlugin: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('exportTypePlugin: Started');
    return {};
  }

  public stop() {}
}
