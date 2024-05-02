/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';

import type { Logger, KibanaRequest, RequestHandlerContext } from '@kbn/core/server';

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import {
  ElasticAssistantApiRequestHandlerContext,
  ElasticAssistantPluginCoreSetupDependencies,
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantRequestHandlerContext,
} from '../types';
import { AIAssistantService } from '../ai_assistant_service';
import { appContextService } from '../services/app_context';

export interface IRequestContextFactory {
  create(
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<ElasticAssistantApiRequestHandlerContext>;
}

interface ConstructorOptions {
  logger: Logger;
  core: ElasticAssistantPluginCoreSetupDependencies;
  plugins: ElasticAssistantPluginSetupDependencies;
  kibanaVersion: string;
  assistantService: AIAssistantService;
}

export class RequestContextFactory implements IRequestContextFactory {
  private readonly logger: Logger;
  private readonly assistantService: AIAssistantService;

  constructor(private readonly options: ConstructorOptions) {
    this.logger = options.logger;
    this.assistantService = options.assistantService;
  }

  public async create(
    context: Omit<ElasticAssistantRequestHandlerContext, 'elasticAssistant'>,
    request: KibanaRequest
  ): Promise<ElasticAssistantApiRequestHandlerContext> {
    const { options } = this;
    const { core } = options;

    const [, startPlugins] = await core.getStartServices();
    const coreContext = await context.core;

    const getSpaceId = (): string =>
      startPlugins.spaces?.spacesService?.getSpaceId(request) || DEFAULT_NAMESPACE_STRING;

    const getCurrentUser = () => startPlugins.security?.authc.getCurrentUser(request);

    return {
      core: coreContext,

      actions: startPlugins.actions,

      logger: this.logger,

      getServerBasePath: () => core.http.basePath.serverBasePath,

      getSpaceId,

      getCurrentUser,

      getRegisteredTools: (pluginName: string) => {
        return appContextService.getRegisteredTools(pluginName);
      },

      getRegisteredFeatures: (pluginName: string) => {
        return appContextService.getRegisteredFeatures(pluginName);
      },

      telemetry: core.analytics,

      getAIAssistantPromptsDataClient: memoize(() => {
        const currentUser = getCurrentUser();
        return this.assistantService.createAIAssistantPromptsDataClient({
          spaceId: getSpaceId(),
          logger: this.logger,
          currentUser,
        });
      }),

      getAIAssistantAnonymizationFieldsDataClient: memoize(() => {
        const currentUser = getCurrentUser();
        return this.assistantService.createAIAssistantAnonymizationFieldsDataClient({
          spaceId: getSpaceId(),
          logger: this.logger,
          currentUser,
        });
      }),

      getAIAssistantConversationsDataClient: memoize(async () => {
        const currentUser = getCurrentUser();
        return this.assistantService.createAIAssistantConversationsDataClient({
          spaceId: getSpaceId(),
          logger: this.logger,
          currentUser,
        });
      }),
    };
  }
}
