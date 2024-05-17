/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';

import { sendMessageEvent } from './analytics/events';
import { defineRoutes } from './routes';
import {
  SearchPlaygroundPluginSetup,
  SearchPlaygroundPluginStart,
  SearchPlaygroundPluginStartDependencies,
} from './types';

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

    defineRoutes({ router, logger: this.logger, getStartServices: core.getStartServices });

    this.registerAnalyticsEvents(core);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  private registerAnalyticsEvents(core: CoreSetup) {
    core.analytics.registerEventType(sendMessageEvent);
  }

  public stop() {}
}
