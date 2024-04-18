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

import { SearchNotebooksPluginSetup, SearchNotebooksPluginStart } from './types';
import { defineRoutes } from './routes';
import { SearchNotebooksConfig } from './config';

export class SearchNotebooksPlugin
  implements Plugin<SearchNotebooksPluginSetup, SearchNotebooksPluginStart>
{
  private readonly config: SearchNotebooksConfig;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchNotebooksConfig>();
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    if (!this.config.enabled) return {};

    this.logger.debug('searchNotebooks: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router, this.logger);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
