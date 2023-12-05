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
import { AIAssistantSOClient } from '../saved_object/ai_assistant_so_client';
import { AIAssistantService } from '../ai_assistant_service';

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

    return {
      core: coreContext,

      actions: startPlugins.actions,

      logger: this.logger,

      getServerBasePath: () => core.http.basePath.serverBasePath,

      getSpaceId,

      getAIAssistantSOClient: memoize(() => {
        const username =
          startPlugins.security?.authc.getCurrentUser(request)?.username || 'elastic';
        return new AIAssistantSOClient({
          logger: options.logger,
          user: username,
          savedObjectsClient: coreContext.savedObjects.client,
        });
      }),

      getAIAssistantDataClient: memoize(async () =>
        this.assistantService.createAIAssistantDatastreamClient({
          namespace: getSpaceId(),
          logger: this.logger,
        })
      ),
    };
  }
}
