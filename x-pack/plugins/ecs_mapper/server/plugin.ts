import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../../src/core/server';

import { EcsMapperPluginSetup, EcsMapperPluginStart } from './types';
import { defineRoutes } from './routes';

export class EcsMapperPlugin implements Plugin<EcsMapperPluginSetup, EcsMapperPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('ecsMapper: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('ecsMapper: Started');
    return {};
  }

  public stop() {}
}
