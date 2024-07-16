/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { SearchHomepageConfig } from './config';

import { defineRoutes } from './routes';
import { SearchHomepagePluginSetup, SearchHomepagePluginStart } from './types';

export class SearchHomepagePlugin
  implements Plugin<SearchHomepagePluginSetup, SearchHomepagePluginStart, {}, {}>
{
  private readonly logger: Logger;
  private readonly config: SearchHomepageConfig;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
  }

  public setup(core: CoreSetup<{}, SearchHomepagePluginStart>) {
    this.logger.debug('searchHomepage: Setup');
    const router = core.http.createRouter();

    defineRoutes({
      getStartServices: core.getStartServices,
      logger: this.logger,
      router,
      options: { hasIndexStats: this.config.enableIndexStats },
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
