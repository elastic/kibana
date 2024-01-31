/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { AssistantFeatures } from '@kbn/elastic-assistant-common';
import { ReplaySubject, type Subject } from 'rxjs';
import { events } from './lib/telemetry/event_based_telemetry';
import {
  AssistantTool,
  ElasticAssistantPluginCoreSetupDependencies,
  ElasticAssistantPluginSetup,
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantPluginStart,
  ElasticAssistantPluginStartDependencies,
  ElasticAssistantRequestHandlerContext,
} from './types';
<<<<<<< HEAD
import { AIAssistantService } from './ai_assistant_service';
import { assistantPromptsType, assistantAnonimizationFieldsType } from './saved_object';
import { RequestContextFactory } from './routes/request_context_factory';
import { PLUGIN_ID } from '../common/constants';
import { registerRoutes } from './routes/register_routes';
import { appContextService } from './services/app_context';
=======
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
>>>>>>> upstream/main

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
  private assistantService: AIAssistantService | undefined;
  private pluginStop$: Subject<void>;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];

  constructor(initializerContext: PluginInitializerContext) {
    this.pluginStop$ = new ReplaySubject(1);
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(
    core: ElasticAssistantPluginCoreSetupDependencies,
    plugins: ElasticAssistantPluginSetupDependencies
  ) {
    this.logger.debug('elasticAssistant: Setup');

    this.assistantService = new AIAssistantService({
      logger: this.logger.get('service'),
      taskManager: plugins.taskManager,
      kibanaVersion: this.kibanaVersion,
      elasticsearchClientPromise: core
        .getStartServices()
        .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
      pluginStop$: this.pluginStop$,
    });

    const requestContextFactory = new RequestContextFactory({
      logger: this.logger,
      core,
      plugins,
      kibanaVersion: this.kibanaVersion,
      assistantService: this.assistantService,
    });

    const router = core.http.createRouter<ElasticAssistantRequestHandlerContext>();
    core.http.registerRouteHandlerContext<ElasticAssistantRequestHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      (context, request) => requestContextFactory.create(context, request)
    );
    events.forEach((eventConfig) => core.analytics.registerEventType(eventConfig));

    core.savedObjects.registerType(assistantPromptsType);
    core.savedObjects.registerType(assistantAnonimizationFieldsType);

    // this.assistantService registerKBTask
    registerRoutes(router, this.logger, plugins);

<<<<<<< HEAD
=======
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
>>>>>>> upstream/main
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
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
