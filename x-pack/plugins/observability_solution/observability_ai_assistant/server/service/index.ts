/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server/plugin';
import { createConcreteWriteIndex, getDataStreamAdapter } from '@kbn/alerting-plugin/server';
import type { CoreSetup, CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { getSpaceIdFromPath } from '@kbn/spaces-plugin/common';
import { once } from 'lodash';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { ObservabilityAIAssistantScreenContextRequest } from '../../common/types';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../types';
import { ChatFunctionClient } from './chat_function_client';
import { ObservabilityAIAssistantClient } from './client';
import { conversationComponentTemplate } from './conversation_component_template';
import { kbComponentTemplate } from './kb_component_template';
import { KnowledgeBaseService } from './knowledge_base_service';
import type { RegistrationCallback, RespondFunctionResources } from './types';
import { ObservabilityAIAssistantConfig } from '../config';

function getResourceName(resource: string) {
  return `.kibana-observability-ai-assistant-${resource}`;
}

export const resourceNames = {
  componentTemplate: {
    conversations: getResourceName('component-template-conversations'),
    kb: getResourceName('component-template-kb'),
  },
  aliases: {
    conversations: getResourceName('conversations'),
    kb: getResourceName('kb'),
  },
  indexPatterns: {
    conversations: getResourceName('conversations*'),
    kb: getResourceName('kb*'),
  },
  indexTemplate: {
    conversations: getResourceName('index-template-conversations'),
    kb: getResourceName('index-template-kb'),
  },
};

export class ObservabilityAIAssistantService {
  private readonly core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  private readonly logger: Logger;
  private kbService?: KnowledgeBaseService;
  private config: ObservabilityAIAssistantConfig;

  private readonly registrations: RegistrationCallback[] = [];

  constructor({
    logger,
    core,
    config,
  }: {
    logger: Logger;
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    config: ObservabilityAIAssistantConfig;
  }) {
    this.core = core;
    this.logger = logger;
    this.config = config;

    this.resetInit();
  }

  init = async () => {};

  private resetInit = () => {
    this.init = once(async () => {
      return this.doInit().catch((error) => {
        this.resetInit(); // reset the once flag if an error occurs
        throw error;
      });
    });
  };

  private doInit = async () => {
    try {
      this.logger.debug('Setting up index assets');
      const [coreStart] = await this.core.getStartServices();

      const { asInternalUser } = coreStart.elasticsearch.client;

      await asInternalUser.cluster.putComponentTemplate({
        create: false,
        name: resourceNames.componentTemplate.conversations,
        template: conversationComponentTemplate,
      });

      await asInternalUser.indices.putIndexTemplate({
        name: resourceNames.indexTemplate.conversations,
        composed_of: [resourceNames.componentTemplate.conversations],
        create: false,
        index_patterns: [resourceNames.indexPatterns.conversations],
        template: {
          settings: {
            number_of_shards: 1,
            auto_expand_replicas: '0-1',
            hidden: true,
          },
        },
      });

      const conversationAliasName = resourceNames.aliases.conversations;

      await createConcreteWriteIndex({
        esClient: asInternalUser,
        logger: this.logger,
        totalFieldsLimit: 10000,
        indexPatterns: {
          alias: conversationAliasName,
          pattern: `${conversationAliasName}*`,
          basePattern: `${conversationAliasName}*`,
          name: `${conversationAliasName}-000001`,
          template: resourceNames.indexTemplate.conversations,
        },
        dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts: false }),
      });

      // Knowledge base: component template
      await asInternalUser.cluster.putComponentTemplate({
        create: false,
        name: resourceNames.componentTemplate.kb,
        template: kbComponentTemplate,
      });

      // Knowledge base: index template
      await asInternalUser.indices.putIndexTemplate({
        name: resourceNames.indexTemplate.kb,
        composed_of: [resourceNames.componentTemplate.kb],
        create: false,
        index_patterns: [resourceNames.indexPatterns.kb],
        template: {
          settings: {
            number_of_shards: 1,
            auto_expand_replicas: '0-1',
            hidden: true,
          },
        },
      });

      const kbAliasName = resourceNames.aliases.kb;

      // Knowledge base: write index
      await createConcreteWriteIndex({
        esClient: asInternalUser,
        logger: this.logger,
        totalFieldsLimit: 10000,
        indexPatterns: {
          alias: kbAliasName,
          pattern: `${kbAliasName}*`,
          basePattern: `${kbAliasName}*`,
          name: `${kbAliasName}-000001`,
          template: resourceNames.indexTemplate.kb,
        },
        dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts: false }),
      });

      this.kbService = new KnowledgeBaseService({
        core: this.core,
        logger: this.logger.get('kb'),
        config: this.config,
        esClient: {
          asInternalUser,
        },
      });

      this.logger.info('Successfully set up index assets');
    } catch (error) {
      this.logger.error(`Failed setting up index assets: ${error.message}`);
      this.logger.debug(error);
      throw error;
    }
  };

  async getClient({
    request,
    scopes,
  }: {
    request: KibanaRequest;
    scopes?: AssistantScope[];
  }): Promise<ObservabilityAIAssistantClient> {
    const controller = new AbortController();

    request.events.aborted$.subscribe(() => {
      controller.abort();
    });

    const [_, [coreStart, plugins]] = await Promise.all([
      this.init(),
      this.core.getStartServices() as Promise<
        [CoreStart, { security: SecurityPluginStart; actions: ActionsPluginStart }, unknown]
      >,
    ]);
    // user will not be found when executed from system connector context
    const user = plugins.security.authc.getCurrentUser(request);

    const soClient = coreStart.savedObjects.getScopedClient(request);

    const basePath = coreStart.http.basePath.get(request);

    const { spaceId } = getSpaceIdFromPath(basePath, coreStart.http.basePath.serverBasePath);

    return new ObservabilityAIAssistantClient({
      actionsClient: await plugins.actions.getActionsClientWithRequest(request),
      uiSettingsClient: coreStart.uiSettings.asScopedToClient(soClient),
      namespace: spaceId,
      esClient: {
        asInternalUser: coreStart.elasticsearch.client.asInternalUser,
        asCurrentUser: coreStart.elasticsearch.client.asScoped(request).asCurrentUser,
      },
      logger: this.logger,
      user: user
        ? {
            id: user.profile_uid,
            name: user.username,
          }
        : undefined,
      knowledgeBaseService: this.kbService!,
      scopes: scopes || ['all'],
    });
  }

  async getFunctionClient({
    screenContexts,
    signal,
    resources,
    client,
    scopes,
  }: {
    screenContexts: ObservabilityAIAssistantScreenContextRequest[];
    signal: AbortSignal;
    resources: RespondFunctionResources;
    client: ObservabilityAIAssistantClient;
    scopes: AssistantScope[];
  }): Promise<ChatFunctionClient> {
    const fnClient = new ChatFunctionClient(screenContexts);

    const params = {
      signal,
      functions: fnClient,
      resources,
      client,
      scopes,
    };

    await Promise.all(
      this.registrations.map((fn) =>
        fn(params).catch((error) => {
          this.logger.error(`Error registering functions`);
          this.logger.error(error);
        })
      )
    );

    return fnClient;
  }

  register(cb: RegistrationCallback) {
    this.registrations.push(cb);
  }
}
