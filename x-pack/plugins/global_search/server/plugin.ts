/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { SearchService, SearchServiceStart } from './services';
import { registerRoutes } from './routes';
import {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  RouteHandlerGlobalSearchContext,
} from './types';

declare module 'src/core/server' {
  interface RequestHandlerContext {
    globalSearch: RouteHandlerGlobalSearchContext;
  }
}

export class GlobalSearchPlugin
  implements Plugin<GlobalSearchPluginSetup, GlobalSearchPluginStart> {
  private readonly logger: Logger;
  private readonly searchService = new SearchService();
  private searchServiceStart?: SearchServiceStart;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
  }

  public setup(core: CoreSetup<{}, GlobalSearchPluginStart>) {
    this.logger.debug('Setting up GlobalSearch plugin');
    const { registerResultProvider } = this.searchService.setup({
      basePath: core.http.basePath,
    });

    registerRoutes(core.http.createRouter());

    core.http.registerRouteHandlerContext('globalSearch', (_, req) => {
      return {
        find: (term, options) => this.searchServiceStart!.find(term, options, req),
      };
    });

    return {
      registerResultProvider,
    };
  }

  public start(core: CoreStart) {
    this.logger.debug('Starting up GlobalSearch plugin');
    this.searchServiceStart = this.searchService.start(core);
    return {
      find: this.searchServiceStart.find,
    };
  }

  public stop() {}
}
