/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { SearchApiKeysPluginSetup, SearchApiKeysPluginStart } from './types';
import { registerRoutes } from './routes/routes';

export class SearchApiKeysPlugin
  implements Plugin<SearchApiKeysPluginSetup, SearchApiKeysPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('searchApiKeys: Setup');
    this.logger.info('searchApiKeys test');
    const router = core.http.createRouter();

    // Register server side APIs
    registerRoutes(router, this.logger);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('searchApiKeys: Started');
    return {};
  }

  public stop() {}
}
