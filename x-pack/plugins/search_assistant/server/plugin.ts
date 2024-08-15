import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { SearchAssistantPluginSetup, SearchAssistantPluginStart } from './types';
import { defineRoutes } from './routes';

export class SearchAssistantPlugin
  implements Plugin<SearchAssistantPluginSetup, SearchAssistantPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('SearchAssistant: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('SearchAssistant: Started');
    return {};
  }

  public stop() {}
}
