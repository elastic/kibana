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
  type AnalyticsServiceSetup,
} from '@kbn/core/server';
import { once } from 'lodash';

import { AssistantFeatures } from '@kbn/elastic-assistant-common';
import { events } from './lib/telemetry/event_based_telemetry';
import {
  AssistantTool,
  ElasticAssistantPluginSetup,
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantPluginStart,
  ElasticAssistantPluginStartDependencies,
  ElasticAssistantRequestHandlerContext,
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
import {
  appContextService,
  GetRegisteredFeatures,
  GetRegisteredTools,
} from './services/app_context';
import { getCapabilitiesRoute } from './routes/capabilities/get_capabilities_route';
import { getEvaluateRoute } from './routes/evaluate/get_evaluate';

interface CreateRouteHandlerContextParams {
  core: CoreSetup<ElasticAssistantPluginStart, unknown>;
  logger: Logger;
  getRegisteredFeatures: GetRegisteredFeatures;
  getRegisteredTools: GetRegisteredTools;
  telemetry: AnalyticsServiceSetup;
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
    getRegisteredFeatures,
    getRegisteredTools,
    telemetry,
  }: CreateRouteHandlerContextParams): IContextProvider<
    ElasticAssistantRequestHandlerContext,
    typeof PLUGIN_ID
  > => {
    return async function elasticAssistantRouteHandlerContext(context, request) {
      const [_, pluginsStart] = await core.getStartServices();

      return {
        actions: pluginsStart.actions,
        getRegisteredFeatures,
        getRegisteredTools,
        logger,
        telemetry,
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
        getRegisteredFeatures: (pluginName: string) => {
          return appContextService.getRegisteredFeatures(pluginName);
        },
        getRegisteredTools: (pluginName: string) => {
          return appContextService.getRegisteredTools(pluginName);
        },
        telemetry: core.analytics,
      })
    );
    events.forEach((eventConfig) => core.analytics.registerEventType(eventConfig));

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
    getEvaluateRoute(router);
    // Capabilities
    getCapabilitiesRoute(router);
    return {
      actions: plugins.actions,
      getRegisteredFeatures: (pluginName: string) => {
        return appContextService.getRegisteredFeatures(pluginName);
      },
      getRegisteredTools: (pluginName: string) => {
        return appContextService.getRegisteredTools(pluginName);
      },
    };
  }

  public start(
    core: CoreStart,
    plugins: ElasticAssistantPluginStartDependencies
  ): ElasticAssistantPluginStart {
    this.logger.debug('elasticAssistant: Started');
    appContextService.start({ logger: this.logger });

    return {
      actions: plugins.actions,
      getRegisteredFeatures: (pluginName: string) => {
        return appContextService.getRegisteredFeatures(pluginName);
      },
      getRegisteredTools: (pluginName: string) => {
        return appContextService.getRegisteredTools(pluginName);
      },
      registerFeatures: (pluginName: string, features: Partial<AssistantFeatures>) => {
        return appContextService.registerFeatures(pluginName, features);
      },
      registerTools: (pluginName: string, tools: AssistantTool[]) => {
        return appContextService.registerTools(pluginName, tools);
      },
    };
  }

  public stop() {
    appContextService.stop();
  }
}
