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
import type {
  RegistrationCallback,
  ObservabilityAIAssistantResourceNames,
  RespondFunctionResources,
} from './types';
import { splitKbText } from './util/split_kb_text';

function getResourceName(resource: string) {
  return `.kibana-observability-ai-assistant-${resource}`;
}

export function createResourceNamesMap() {
  return {
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
    pipelines: {
      kb: getResourceName('kb-ingest-pipeline'),
    },
  };
}

export const INDEX_QUEUED_DOCUMENTS_TASK_ID = 'observabilityAIAssistant:indexQueuedDocumentsTask';

export const INDEX_QUEUED_DOCUMENTS_TASK_TYPE = INDEX_QUEUED_DOCUMENTS_TASK_ID + 'Type';

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
  private readonly getModelId: () => Promise<string>;
  private kbService?: KnowledgeBaseService;

  private readonly resourceNames: ObservabilityAIAssistantResourceNames = createResourceNamesMap();

  private readonly registrations: RegistrationCallback[] = [];

  constructor({
    logger,
    core,
    taskManager,
    getModelId,
  }: {
    logger: Logger;
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    taskManager: TaskManagerSetupContract;
    getModelId: () => Promise<string>;
  }) {
    this.core = core;
    this.logger = logger;
    this.getModelId = getModelId;

    this.allowInit();

    taskManager.registerTaskDefinitions({
      [INDEX_QUEUED_DOCUMENTS_TASK_TYPE]: {
        title: 'Index queued KB articles',
        description:
          'Indexes previously registered entries into the knowledge base when it is ready',
        timeout: '30m',
        maxAttempts: 2,
        createTaskRunner: (context) => {
          return {
            run: async () => {
              if (this.kbService) {
                await this.kbService.processQueue();
              }
            },
          };
        },
      },
    });
  }

  getKnowledgeBaseStatus() {
    return this.init().then(() => {
      return this.kbService!.status();
    });
  }

  init = async () => {};

  private allowInit = () => {
    this.init = once(async () => {
      return this.doInit().catch((error) => {
        this.allowInit();
        throw error;
      });
    });
  };

  private doInit = async () => {
    try {
      const [coreStart, pluginsStart] = await this.core.getStartServices();

      const elserModelId = await this.getModelId();

      const esClient = coreStart.elasticsearch.client.asInternalUser;

      await esClient.cluster.putComponentTemplate({
        create: false,
        name: this.resourceNames.componentTemplate.conversations,
        template: conversationComponentTemplate,
      });

      await esClient.indices.putIndexTemplate({
        name: this.resourceNames.indexTemplate.conversations,
        composed_of: [this.resourceNames.componentTemplate.conversations],
        create: false,
        index_patterns: [this.resourceNames.indexPatterns.conversations],
        template: {
          settings: {
            number_of_shards: 1,
            auto_expand_replicas: '0-1',
            hidden: true,
          },
          mappings: {
            _meta: {
              model: elserModelId,
            },
          },
        },
      });

      const conversationAliasName = this.resourceNames.aliases.conversations;

      await createConcreteWriteIndex({
        esClient,
        logger: this.logger,
        totalFieldsLimit: 10000,
        indexPatterns: {
          alias: conversationAliasName,
          pattern: `${conversationAliasName}*`,
          basePattern: `${conversationAliasName}*`,
          name: `${conversationAliasName}-000001`,
          template: this.resourceNames.indexTemplate.conversations,
        },
        dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts: false }),
      });

      await esClient.cluster.putComponentTemplate({
        create: false,
        name: this.resourceNames.componentTemplate.kb,
        template: kbComponentTemplate,
      });

      await esClient.ingest.putPipeline({
        id: this.resourceNames.pipelines.kb,
        processors: [
          {
            inference: {
              model_id: elserModelId,
              target_field: 'ml',
              field_map: {
                text: 'text_field',
              },
              inference_config: {
                // @ts-expect-error
                text_expansion: {
                  results_field: 'tokens',
                },
              },
            },
          },
        ],
      });

      await esClient.indices.putIndexTemplate({
        name: this.resourceNames.indexTemplate.kb,
        composed_of: [this.resourceNames.componentTemplate.kb],
        create: false,
        index_patterns: [this.resourceNames.indexPatterns.kb],
        template: {
          settings: {
            number_of_shards: 1,
            auto_expand_replicas: '0-1',
            hidden: true,
          },
        },
      });

      const kbAliasName = this.resourceNames.aliases.kb;

      await createConcreteWriteIndex({
        esClient,
        logger: this.logger,
        totalFieldsLimit: 10000,
        indexPatterns: {
          alias: kbAliasName,
          pattern: `${kbAliasName}*`,
          basePattern: `${kbAliasName}*`,
          name: `${kbAliasName}-000001`,
          template: this.resourceNames.indexTemplate.kb,
        },
        dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts: false }),
      });

      this.kbService = new KnowledgeBaseService({
        logger: this.logger.get('kb'),
        esClient,
        resources: this.resourceNames,
        taskManagerStart: pluginsStart.taskManager,
        getModelId: this.getModelId,
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
      resources: this.resourceNames,
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
