/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, PluginInitializerContext, CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import { registerRoutes } from './routes';
import { IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart } from './types';

export class IntegrationAssistantPlugin
  implements Plugin<IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    this.logger.debug('integrationAssistant api: Setup');
    registerRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('integrationAssistant api: Started');
    return {};
  }

  public stop() {}
}
