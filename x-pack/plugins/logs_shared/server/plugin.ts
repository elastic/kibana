import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../../src/core/server';

import { LogsSharedPluginSetup, LogsSharedPluginStart } from './types';
import { defineRoutes } from './routes';

export class LogsSharedPlugin implements Plugin<LogsSharedPluginSetup, LogsSharedPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('logsShared: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('logsShared: Started');
    return {};
  }

  public stop() {}
}
