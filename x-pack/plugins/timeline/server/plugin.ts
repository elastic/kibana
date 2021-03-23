import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../../src/core/server';

import { TimelinePluginSetup, TimelinePluginStart } from './types';
import { defineRoutes } from './routes';

export class TimelinePlugin implements Plugin<TimelinePluginSetup, TimelinePluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('timeline: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('timeline: Started');
    return {};
  }

  public stop() {}
}
