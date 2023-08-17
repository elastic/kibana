/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Boom from '@hapi/boom';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server/plugin';
import { createConcreteWriteIndex } from '@kbn/alerting-plugin/server';
import type { CoreSetup, CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { getSpaceIdFromPath } from '@kbn/spaces-plugin/common';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { once } from 'lodash';
import { KnowledgeBaseEntry } from '../../common/types';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../types';
import { ObservabilityAIAssistantClient } from './client';
import { conversationComponentTemplate } from './conversation_component_template';
import { kbComponentTemplate } from './kb_component_template';
import { KnowledgeBaseService } from './kb_service';
import type { ObservabilityAIAssistantResourceNames } from './types';

function getResourceName(resource: string) {
  return `.kibana-observability-ai-assistant-${resource}`;
}

export const INDEX_QUEUED_DOCUMENTS_TASK_ID = 'observabilityAIAssistant:indexQueuedDocumentsTask';

export const INDEX_QUEUED_DOCUMENTS_TASK_TYPE = INDEX_QUEUED_DOCUMENTS_TASK_ID + 'Type';

export class ObservabilityAIAssistantService {
  private readonly core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  private readonly logger: Logger;
  private kbService?: KnowledgeBaseService;

  private readonly resourceNames: ObservabilityAIAssistantResourceNames = {
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
    ilmPolicy: {
      conversations: getResourceName('ilm-policy-conversations'),
    },
    pipelines: {
      kb: getResourceName('kb-ingest-pipeline'),
    },
  };

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
                // await this.kbService.processQueue();
              }
            },
          };
        },
      },
    });
  }

  init = once(async () => {
    try {
      const [coreStart, pluginsStart] = await this.core.getStartServices();

      const esClient = coreStart.elasticsearch.client.asInternalUser;

      await esClient.cluster.putComponentTemplate({
        create: false,
        name: this.resourceNames.componentTemplate.conversations,
        template: conversationComponentTemplate,
      });

      await esClient.ilm.putLifecycle({
        name: this.resourceNames.ilmPolicy.conversations,
        policy: {
          phases: {
            hot: {
              min_age: '0s',
              actions: {
                rollover: {
                  max_age: '90d',
                  max_primary_shard_size: '50gb',
                },
              },
            },
          },
        },
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
            refresh_interval: '1s',
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
              model_id: '.elser_model_1',
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
            refresh_interval: '1s',
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
      });

      this.kbService = new KnowledgeBaseService({
        logger: this.logger.get('kb'),
        esClient,
        resources: this.resourceNames,
        taskManagerStart: pluginsStart.taskManager,
      });

      this.logger.info('Successfully set up index assets');
    } catch (error) {
      this.logger.error(`Failed to initialize service: ${error.message}`);
      this.logger.debug(error);
      throw error;
    }
  });

  async getClient({
    request,
  }: {
    request: KibanaRequest;
  }): Promise<ObservabilityAIAssistantClient> {
    const [_, [coreStart, plugins]] = await Promise.all([
      this.init(),
      this.core.getStartServices() as Promise<
        [CoreStart, { security: SecurityPluginStart; actions: ActionsPluginStart }, unknown]
      >,
    ]);

    const user = plugins.security.authc.getCurrentUser(request);

    if (!user) {
      throw Boom.forbidden(`User not found for current request`);
    }

    const basePath = coreStart.http.basePath.get(request);

    const { spaceId } = getSpaceIdFromPath(basePath, coreStart.http.basePath.serverBasePath);

    return new ObservabilityAIAssistantClient({
      actionsClient: await plugins.actions.getActionsClientWithRequest(request),
      namespace: spaceId,
      esClient: coreStart.elasticsearch.client.asInternalUser,
      resources: this.resourceNames,
      logger: this.logger,
      user: {
        id: user.profile_uid,
        name: user.username,
      },
      knowledgeBaseService: this.kbService!,
    });
  }

  async addToKnowledgeBase(
    entries: Array<
      Omit<KnowledgeBaseEntry, 'is_correction' | 'public' | 'confidence' | '@timestamp'>
    >
  ): Promise<void> {
    await this.init();
    this.kbService!.store(
      entries.map((entry) => ({
        ...entry,
        '@timestamp': new Date().toISOString(),
        public: true,
        confidence: 'high',
        is_correction: false,
      }))
    );
  }
}
