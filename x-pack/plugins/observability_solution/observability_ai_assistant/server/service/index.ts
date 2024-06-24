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
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { once } from 'lodash';
import {
  KnowledgeBaseEntryRole,
  ObservabilityAIAssistantScreenContextRequest,
} from '../../common/types';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../types';
import { ChatFunctionClient } from './chat_function_client';
import { ObservabilityAIAssistantClient } from './client';
import { conversationComponentTemplate } from './conversation_component_template';
import { kbComponentTemplate } from './kb_component_template';
import { KnowledgeBaseEntryOperationType, KnowledgeBaseService } from './knowledge_base_service';
import { registerIndexQueuedDocumentsTask } from './task_manager_definitions/register_index_queued_documents_task';
import type { RegistrationCallback, RespondFunctionResources } from './types';
import { splitKbText } from './util/split_kb_text';

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

type KnowledgeBaseEntryRequest = { id: string; labels?: Record<string, string> } & (
  | {
      text: string;
    }
  | {
      texts: string[];
    }
);

export class ObservabilityAIAssistantService {
  private readonly core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  private readonly logger: Logger;
  private kbService?: KnowledgeBaseService;

  private readonly registrations: RegistrationCallback[] = [];

  constructor({
    logger,
    core,
    taskManager,
  }: {
    logger: Logger;
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    taskManager: TaskManagerSetupContract;
  }) {
    this.core = core;
    this.logger = logger;

    this.registerInit();

    const getTaskManagerStart = async () => {
      const [, pluginsStart] = await core.getStartServices();
      return pluginsStart.taskManager;
    };

    registerIndexQueuedDocumentsTask({
      taskManager,
      logger,
      getKbService: () => this.kbService,
      getTaskManagerStart,
    });

    // registerMigrateKnowledgeBaseEntriesTask({
    //   taskManager,
    //   logger,
    //   getEsClient: async () => {
    //     const [coreStart] = await core.getStartServices();
    //     return coreStart.elasticsearch.client.asInternalUser;
    //   },
    //   getTaskManagerStart,
    // });
  }

  init = async () => {};

  private registerInit = () => {
    this.init = once(async () => {
      return this.doInit().catch((error) => {
        this.registerInit(); // reset the once flag if an error occurs
        throw error;
      });
    });
  };

  private doInit = async () => {
    try {
      const [coreStart, pluginsStart] = await this.core.getStartServices();

      const esClient = {
        asInternalUser: coreStart.elasticsearch.client.asInternalUser,
      };

      await esClient.asInternalUser.cluster.putComponentTemplate({
        create: false,
        name: resourceNames.componentTemplate.conversations,
        template: conversationComponentTemplate,
      });

      await esClient.asInternalUser.indices.putIndexTemplate({
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
        esClient: esClient.asInternalUser,
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

      await esClient.asInternalUser.cluster.putComponentTemplate({
        create: false,
        name: resourceNames.componentTemplate.kb,
        template: kbComponentTemplate,
      });

      await esClient.asInternalUser.indices.putIndexTemplate({
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

      await createConcreteWriteIndex({
        esClient: esClient.asInternalUser,
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
        logger: this.logger.get('kb'),
        esClient,
        taskManagerStart: pluginsStart.taskManager,
      });

      this.logger.info('Successfully set up index assets');
    } catch (error) {
      this.logger.error(`Failed to initialize service: ${error.message}`);
      this.logger.debug(error);
      throw error;
    }
  };

  async getClient({
    request,
  }: {
    request: KibanaRequest;
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
    });
  }

  async getFunctionClient({
    screenContexts,
    signal,
    resources,
    client,
  }: {
    screenContexts: ObservabilityAIAssistantScreenContextRequest[];
    signal: AbortSignal;
    resources: RespondFunctionResources;
    client: ObservabilityAIAssistantClient;
  }): Promise<ChatFunctionClient> {
    const fnClient = new ChatFunctionClient(screenContexts);

    const params = {
      signal,
      functions: fnClient,
      resources,
      client,
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

  addToKnowledgeBase(entries: KnowledgeBaseEntryRequest[]): void {
    this.init()
      .then(() => {
        this.kbService!.queue(
          entries.flatMap((entry) => {
            const entryWithSystemProperties = {
              ...entry,
              '@timestamp': new Date().toISOString(),
              doc_id: entry.id,
              public: true,
              confidence: 'high' as const,
              is_correction: false,
              labels: {
                ...entry.labels,
              },
              role: KnowledgeBaseEntryRole.Elastic,
            };

            const operations =
              'texts' in entryWithSystemProperties
                ? splitKbText(entryWithSystemProperties)
                : [
                    {
                      type: KnowledgeBaseEntryOperationType.Index,
                      document: entryWithSystemProperties,
                    },
                  ];

            return operations;
          })
        );
      })
      .catch((error) => {
        this.logger.error(
          `Could not index ${entries.length} entries because of an initialisation error`
        );
        this.logger.error(error);
      });
  }

  addCategoryToKnowledgeBase(categoryId: string, entries: KnowledgeBaseEntryRequest[]) {
    this.addToKnowledgeBase(
      entries.map((entry) => {
        return {
          ...entry,
          labels: {
            ...entry.labels,
            category: categoryId,
          },
        };
      })
    );
  }

  register(cb: RegistrationCallback) {
    this.registrations.push(cb);
  }
}
