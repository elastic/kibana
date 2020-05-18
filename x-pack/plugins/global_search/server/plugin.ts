/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { SearchService, SearchServiceStart } from './services';
import { registerRoutes } from './routes';
import {
  GlobalSearchPluginSetup,
  GlobalSearchPluginStart,
  RouteHandlerGlobalSearchContext,
} from './types';
import { GlobalSearchConfigType } from './config';

declare module 'src/core/server' {
  interface RequestHandlerContext {
    globalSearch?: RouteHandlerGlobalSearchContext;
  }
}

export class GlobalSearchPlugin
  implements Plugin<GlobalSearchPluginSetup, GlobalSearchPluginStart> {
  private readonly logger: Logger;
  private readonly config$: Observable<GlobalSearchConfigType>;
  private readonly searchService = new SearchService();
  private searchServiceStart?: SearchServiceStart;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config$ = context.config.create<GlobalSearchConfigType>();
  }

  public async setup(core: CoreSetup<{}, GlobalSearchPluginStart>) {
    this.logger.debug('Setting up GlobalSearch plugin');

    const config = await this.config$.pipe(take(1)).toPromise();
    const { registerResultProvider } = this.searchService.setup({
      basePath: core.http.basePath,
      config,
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
