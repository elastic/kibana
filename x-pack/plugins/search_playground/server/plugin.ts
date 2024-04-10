/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import {
  SearchPlaygroundPluginSetup,
  SearchPlaygroundPluginStart,
  SearchPlaygroundPluginStartDependencies,
} from './types';
import { defineRoutes } from './routes';

export class SearchPlaygroundPlugin
  implements
    Plugin<
      SearchPlaygroundPluginSetup,
      SearchPlaygroundPluginStart,
      {},
      SearchPlaygroundPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<SearchPlaygroundPluginStartDependencies, SearchPlaygroundPluginStart>
  ) {
    this.logger.debug('searchPlayground: Setup');
    const router = core.http.createRouter();

    defineRoutes({ router, log: this.logger, getStartServices: core.getStartServices });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
