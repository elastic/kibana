/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  IContextProvider,
} from '@kbn/core/server';

import { postMessagesRoute } from './routes/post_messages';
import { AIAssistantStoreService } from './lib/store/service';
import { getStoreRoute } from './routes/get_store';
import {
  ElasticAssistantPluginSetup,
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantPluginStart,
  ElasticAssistantPluginStartDependencies,
  ElasticAssistantRequestHandlerContext,
} from './types';
import { postActionsConnectorExecuteRoute } from './routes';

export class ElasticAssistantPlugin
  implements
    Plugin<
      ElasticAssistantPluginSetup,
      ElasticAssistantPluginStart,
      ElasticAssistantPluginSetupDependencies,
      ElasticAssistantPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  private createRouteHandlerContext = (
    core: CoreSetup<ElasticAssistantPluginStart, unknown>
  ): IContextProvider<ElasticAssistantRequestHandlerContext, 'elasticAssistant'> => {
    return async function elasticAssistantRouteHandlerContext(context, request) {
      const [_, pluginsStart] = await core.getStartServices();

      return {
        actions: pluginsStart.actions,
      };
    };
  };

  public setup(
    core: CoreSetup<ElasticAssistantPluginStartDependencies>,
    plugins: ElasticAssistantPluginSetupDependencies
  ) {
    this.logger.debug('elasticAssistant: Setup');
    const router = core.http.createRouter<ElasticAssistantRequestHandlerContext>();

    core.http.registerRouteHandlerContext<
      ElasticAssistantRequestHandlerContext,
      'elasticAssistant'
    >(
      'elasticAssistant',
      this.createRouteHandlerContext(core as CoreSetup<ElasticAssistantPluginStart, unknown>)
    );

    const service = new AIAssistantStoreService({
      logger: this.logger.get('service'),
      core,
    });

    postActionsConnectorExecuteRoute(router);
    getStoreRoute(router, service);
    postMessagesRoute(router, service);
    return {
      actions: plugins.actions,
    };
  }

  public start(core: CoreStart, plugins: ElasticAssistantPluginStartDependencies) {
    this.logger.debug('elasticAssistant: Started');

    return {
      actions: plugins.actions,
    };
  }

  public stop() {}
}
