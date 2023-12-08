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
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { once } from 'lodash';

import {
  ElasticAssistantPluginSetup,
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantPluginStart,
  ElasticAssistantPluginStartDependencies,
  ElasticAssistantRequestHandlerContext,
  GetApplicableTools,
  GetElser,
  PLUGIN_ID,
} from './types';
import {
  deleteKnowledgeBaseRoute,
  getKnowledgeBaseStatusRoute,
  postActionsConnectorExecuteRoute,
  postEvaluateRoute,
  postKnowledgeBaseRoute,
} from './routes';
import { appContextService, GetRegisteredTools } from './services/app_context';

interface CreateRouteHandlerContextParams {
  core: CoreSetup<ElasticAssistantPluginStart, unknown>;
  logger: Logger;
  getRegisteredTools: GetRegisteredTools;
}

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

  private createRouteHandlerContext = ({
    core,
    logger,
    getRegisteredTools,
  }: CreateRouteHandlerContextParams): IContextProvider<
    ElasticAssistantRequestHandlerContext,
    typeof PLUGIN_ID
  > => {
    return async function elasticAssistantRouteHandlerContext(context, request) {
      const [_, pluginsStart] = await core.getStartServices();

      return {
        actions: pluginsStart.actions,
        getRegisteredTools,
        logger,
      };
    };
  };

  public setup(core: CoreSetup, plugins: ElasticAssistantPluginSetupDependencies) {
    this.logger.debug('elasticAssistant: Setup');
    const router = core.http.createRouter<ElasticAssistantRequestHandlerContext>();
    core.http.registerRouteHandlerContext<ElasticAssistantRequestHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      this.createRouteHandlerContext({
        core: core as CoreSetup<ElasticAssistantPluginStart, unknown>,
        logger: this.logger,
        getRegisteredTools: (pluginName: string) => {
          return appContextService.getRegisteredTools(pluginName);
        },
      })
    );

    const getElserId: GetElser = once(
      async (request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) => {
        return (await plugins.ml.trainedModelsProvider(request, savedObjectsClient).getELSER())
          .model_id;
      }
    );

    // Knowledge Base
    deleteKnowledgeBaseRoute(router);
    getKnowledgeBaseStatusRoute(router, getElserId);
    postKnowledgeBaseRoute(router, getElserId);
    // Actions Connector Execute (LLM Wrapper)
    postActionsConnectorExecuteRoute(router, getElserId);
    // Evaluate
    postEvaluateRoute(router, getElserId);
    return {
      actions: plugins.actions,
      getRegisteredTools: (pluginName: string) => {
        return appContextService.getRegisteredTools(pluginName);
      },
    };
  }

  public start(core: CoreStart, plugins: ElasticAssistantPluginStartDependencies) {
    this.logger.debug('elasticAssistant: Started');
    appContextService.start({ logger: this.logger });

    return {
      actions: plugins.actions,
      getRegisteredTools: (pluginName: string) => {
        return appContextService.getRegisteredTools(pluginName);
      },
      registerTools: (pluginName: string, getApplicableTools: GetApplicableTools) => {
        return appContextService.registerTools(pluginName, getApplicableTools);
      },
    };
  }

  public stop() {
    appContextService.stop();
  }
}
