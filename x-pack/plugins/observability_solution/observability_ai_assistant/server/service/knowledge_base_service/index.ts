/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import { serverUnavailable, gatewayTimeout, badRequest } from '@hapi/boom';
import type { ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import pRetry from 'p-retry';
import { orderBy } from 'lodash';
import { encode } from 'gpt-tokenizer';
import { MlTrainedModelDeploymentNodesStats } from '@elastic/elasticsearch/lib/api/types';
import { resourceNames } from '..';
import {
  Instruction,
  KnowledgeBaseEntry,
  KnowledgeBaseEntryRole,
  KnowledgeBaseType,
} from '../../../common/types';
import { getAccessQuery } from '../util/get_access_query';
import { getCategoryQuery } from '../util/get_category_query';
import { recallFromConnectors } from './recall_from_connectors';

interface Dependencies {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  taskManagerStart: TaskManagerStartContract;
  getModelId: () => Promise<string>;
  enabled: boolean;
}

export interface RecalledEntry {
  id: string;
  text: string;
  score: number | null;
  is_correction?: boolean;
  labels?: Record<string, string>;
}

function isModelMissingOrUnavailableError(error: Error) {
  return (
    error instanceof errors.ResponseError &&
    (error.body?.error?.type === 'resource_not_found_exception' ||
      error.body?.error?.type === 'status_exception')
  );
}
function isCreateModelValidationError(error: Error) {
  return (
    error instanceof errors.ResponseError &&
    error.statusCode === 400 &&
    error.body?.error?.type === 'action_request_validation_exception'
  );
}
function throwKnowledgeBaseNotReady(body: any) {
  throw serverUnavailable(`Knowledge base is not ready yet`, body);
}

export class KnowledgeBaseService {
  constructor(private readonly dependencies: Dependencies) {}

  setup = async () => {
    this.dependencies.logger.debug('Setting up knowledge base');
    if (!this.dependencies.enabled) {
      return;
    }
    const elserModelId = await this.dependencies.getModelId();

    const retryOptions = { factor: 1, minTimeout: 10000, retries: 12 };
    const getModelInfo = async () => {
      return await this.dependencies.esClient.asInternalUser.ml.getTrainedModels({
        model_id: elserModelId,
        include: 'definition_status',
      });
    };

    const isModelInstalledAndReady = async () => {
      try {
        const getResponse = await getModelInfo();
        this.dependencies.logger.debug(
          () => 'Model definition status:\n' + JSON.stringify(getResponse.trained_model_configs[0])
        );

        return Boolean(getResponse.trained_model_configs[0]?.fully_defined);
      } catch (error) {
        if (isModelMissingOrUnavailableError(error)) {
          return false;
        }

        throw error;
      }
    };

    const installModelIfDoesNotExist = async () => {
      const modelInstalledAndReady = await isModelInstalledAndReady();
      if (!modelInstalledAndReady) {
        await installModel();
      }
    };

    const installModel = async () => {
      this.dependencies.logger.info(`Installing ${elserModelId} model`);
      try {
        await this.dependencies.esClient.asInternalUser.ml.putTrainedModel(
          {
            model_id: elserModelId,
            input: {
              field_names: ['text_field'],
            },
            wait_for_completion: true,
          },
          { requestTimeout: '20m' }
        );
      } catch (error) {
        if (isCreateModelValidationError(error)) {
          throw badRequest(error);
        } else {
          throw error;
        }
      }
      this.dependencies.logger.info(`Finished installing ${elserModelId} model`);
    };

    const pollForModelInstallCompleted = async () => {
      await pRetry(async () => {
        this.dependencies.logger.info(`Polling installation of ${elserModelId} model`);
        const modelInstalledAndReady = await isModelInstalledAndReady();
        if (!modelInstalledAndReady) {
          throwKnowledgeBaseNotReady({
            message: 'Model is not fully defined',
          });
        }
      }, retryOptions);
    };
    await installModelIfDoesNotExist();
    await pollForModelInstallCompleted();

    try {
      await this.dependencies.esClient.asInternalUser.ml.startTrainedModelDeployment({
        model_id: elserModelId,
        wait_for: 'fully_allocated',
      });
    } catch (error) {
      this.dependencies.logger.debug(`Error starting ${elserModelId} model deployment`);
      this.dependencies.logger.debug(error);
      if (!isModelMissingOrUnavailableError(error)) {
        throw error;
      }
    }

    await pRetry(async () => {
      const response = await this.dependencies.esClient.asInternalUser.ml.getTrainedModelsStats({
        model_id: elserModelId,
      });

      const isReady = response.trained_model_stats.some((stats) =>
        (stats.deployment_stats?.nodes as unknown as MlTrainedModelDeploymentNodesStats[]).some(
          (node) => node.routing_state.routing_state === 'started'
        )
      );

      if (isReady) {
        return;
      }

      this.dependencies.logger.debug(`${elserModelId} model is not allocated yet`);
      this.dependencies.logger.debug(() => JSON.stringify(response));

      throw gatewayTimeout();
    }, retryOptions);

    this.dependencies.logger.info(`${elserModelId} model is ready`);
  };

  status = async () => {
    this.dependencies.logger.debug('Checking model status');
    if (!this.dependencies.enabled) {
      return { ready: false, enabled: false };
    }
    const elserModelId = await this.dependencies.getModelId();

    try {
      const modelStats = await this.dependencies.esClient.asInternalUser.ml.getTrainedModelsStats({
        model_id: elserModelId,
      });
      const elserModelStats = modelStats.trained_model_stats[0];
      const deploymentState = elserModelStats.deployment_stats?.state;
      const allocationState = elserModelStats.deployment_stats?.allocation_status.state;
      const ready = deploymentState === 'started' && allocationState === 'fully_allocated';

      this.dependencies.logger.debug(
        `Model deployment state: ${deploymentState}, allocation state: ${allocationState}, ready: ${ready}`
      );

      return {
        ready,
        deployment_state: deploymentState,
        allocation_state: allocationState,
        model_name: elserModelId,
        enabled: true,
      };
    } catch (error) {
      this.dependencies.logger.debug(
        `Failed to get status for model "${elserModelId}" due to ${error.message}`
      );

      return {
        error: error instanceof errors.ResponseError ? error.body.error : String(error),
        ready: false,
        enabled: true,
        model_name: elserModelId,
      };
    }
  };

  private async recallFromKnowledgeBase({
    queries,
    categories,
    namespace,
    user,
    modelId,
  }: {
    queries: Array<{ text: string; boost?: number }>;
    categories?: string[];
    namespace: string;
    user?: { name: string };
    modelId: string;
  }): Promise<RecalledEntry[]> {
    const esQuery = {
      bool: {
        should: queries.map(({ text, boost = 1 }) => ({
          text_expansion: {
            'ml.tokens': {
              model_text: text,
              model_id: modelId,
              boost,
            },
          },
        })),
        filter: [
          ...getAccessQuery({
            user,
            namespace,
          }),
          ...getCategoryQuery({ categories }),

          // exclude user instructions
          { bool: { must_not: { term: { type: KnowledgeBaseType.UserInstruction } } } },
        ],
      },
    };

    const response = await this.dependencies.esClient.asInternalUser.search<
      Pick<KnowledgeBaseEntry, 'text' | 'is_correction' | 'labels' | 'title'> & { doc_id?: string }
    >({
      index: [resourceNames.aliases.kb],
      query: esQuery,
      size: 20,
      _source: {
        includes: ['text', 'is_correction', 'labels', 'doc_id', 'title'],
      },
    });

    return response.hits.hits.map((hit) => ({
      text: hit._source?.text!,
      is_correction: hit._source?.is_correction,
      labels: hit._source?.labels,
      title: hit._source?.title ?? hit._source?.doc_id, // use `doc_id` as fallback title for backwards compatibility
      score: hit._score!,
      id: hit._id!,
    }));
  }

  recall = async ({
    user,
    queries,
    categories,
    namespace,
    esClient,
    uiSettingsClient,
  }: {
    queries: Array<{ text: string; boost?: number }>;
    categories?: string[];
    user?: { name: string };
    namespace: string;
    esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
    uiSettingsClient: IUiSettingsClient;
  }): Promise<RecalledEntry[]> => {
    if (!this.dependencies.enabled) {
      return [];
    }

    this.dependencies.logger.debug(
      () => `Recalling entries from KB for queries: "${JSON.stringify(queries)}"`
    );
    const modelId = await this.dependencies.getModelId();

    const [documentsFromKb, documentsFromConnectors] = await Promise.all([
      this.recallFromKnowledgeBase({
        user,
        queries,
        categories,
        namespace,
        modelId,
      }).catch((error) => {
        if (isModelMissingOrUnavailableError(error)) {
          throwKnowledgeBaseNotReady(error.body);
        }
        throw error;
      }),
      recallFromConnectors({
        esClient,
        uiSettingsClient,
        queries,
        modelId,
        logger: this.dependencies.logger,
      }).catch((error) => {
        this.dependencies.logger.debug('Error getting data from search indices');
        this.dependencies.logger.debug(error);
        return [];
      }),
    ]);

    this.dependencies.logger.debug(
      `documentsFromKb: ${JSON.stringify(documentsFromKb.slice(0, 5), null, 2)}`
    );
    this.dependencies.logger.debug(
      `documentsFromConnectors: ${JSON.stringify(documentsFromConnectors.slice(0, 5), null, 2)}`
    );

    const sortedEntries = orderBy(
      documentsFromKb.concat(documentsFromConnectors),
      'score',
      'desc'
    ).slice(0, 20);

    const MAX_TOKENS = 4000;

    let tokenCount = 0;

    const returnedEntries: RecalledEntry[] = [];

    for (const entry of sortedEntries) {
      returnedEntries.push(entry);
      tokenCount += encode(entry.text).length;
      if (tokenCount >= MAX_TOKENS) {
        break;
      }
    }

    const droppedEntries = sortedEntries.length - returnedEntries.length;
    if (droppedEntries > 0) {
      this.dependencies.logger.info(`Dropped ${droppedEntries} entries because of token limit`);
    }

    return returnedEntries;
  };

  getUserInstructions = async (
    namespace: string,
    user?: { name: string }
  ): Promise<Array<Instruction & { public?: boolean }>> => {
    if (!this.dependencies.enabled) {
      return [];
    }
    try {
      const response = await this.dependencies.esClient.asInternalUser.search<KnowledgeBaseEntry>({
        index: resourceNames.aliases.kb,
        query: {
          bool: {
            filter: [
              {
                term: {
                  type: KnowledgeBaseType.UserInstruction,
                },
              },
              ...getAccessQuery({ user, namespace }),
            ],
          },
        },
        size: 500,
        _source: ['id', 'text', 'public'],
      });

      return response.hits.hits.map((hit) => ({
        id: hit._id!,
        text: hit._source?.text ?? '',
        public: hit._source?.public,
      }));
    } catch (error) {
      this.dependencies.logger.error('Failed to load instructions from knowledge base');
      this.dependencies.logger.error(error);
      return [];
    }
  };

  getEntries = async ({
    query,
    sortBy,
    sortDirection,
  }: {
    query?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<{ entries: KnowledgeBaseEntry[] }> => {
    if (!this.dependencies.enabled) {
      return { entries: [] };
    }
    try {
      const response = await this.dependencies.esClient.asInternalUser.search<KnowledgeBaseEntry>({
        index: resourceNames.aliases.kb,
        query: {
          bool: {
            filter: [
              // filter by search query
              ...(query
                ? [{ query_string: { query: `${query}*`, fields: ['doc_id', 'title'] } }]
                : []),
              {
                // exclude user instructions
                bool: { must_not: { term: { type: KnowledgeBaseType.UserInstruction } } },
              },
            ],
          },
        },
        sort:
          sortBy === 'title'
            ? [
                { ['title.keyword']: { order: sortDirection } },
                { doc_id: { order: sortDirection } }, // sort by doc_id for backwards compatibility
              ]
            : [{ [String(sortBy)]: { order: sortDirection } }],
        size: 500,
        _source: {
          includes: [
            'title',
            'doc_id',
            'text',
            'is_correction',
            'labels',
            'confidence',
            'public',
            '@timestamp',
            'role',
            'user.name',
            'type',
          ],
        },
      });

      return {
        entries: response.hits.hits.map((hit) => ({
          ...hit._source!,
          role: hit._source!.role ?? KnowledgeBaseEntryRole.UserEntry,
          score: hit._score,
          id: hit._id!,
        })),
      };
    } catch (error) {
      if (isModelMissingOrUnavailableError(error)) {
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
    }
  };

  getPersonalUserInstructionId = async ({
    isPublic,
    user,
    namespace,
  }: {
    isPublic: boolean;
    user?: { name: string; id?: string };
    namespace?: string;
  }) => {
    if (!this.dependencies.enabled) {
      return null;
    }
    const res = await this.dependencies.esClient.asInternalUser.search<KnowledgeBaseEntry>({
      index: resourceNames.aliases.kb,
      query: {
        bool: {
          filter: [
            { term: { type: KnowledgeBaseType.UserInstruction } },
            { term: { public: isPublic } },
            ...getAccessQuery({ user, namespace }),
          ],
        },
      },
      size: 1,
      _source: false,
    });

    return res.hits.hits[0]?._id;
  };

  getUuidFromDocId = async ({
    docId,
    user,
    namespace,
  }: {
    docId: string;
    user?: { name: string; id?: string };
    namespace?: string;
  }) => {
    const query = {
      bool: {
        filter: [
          { term: { doc_id: docId } },

          // exclude user instructions
          { bool: { must_not: { term: { type: KnowledgeBaseType.UserInstruction } } } },

          // restrict access to user's own entries
          ...getAccessQuery({ user, namespace }),
        ],
      },
    };

    const response = await this.dependencies.esClient.asInternalUser.search<KnowledgeBaseEntry>({
      size: 1,
      index: resourceNames.aliases.kb,
      query,
      _source: false,
    });

    return response.hits.hits[0]?._id;
  };

  addEntry = async ({
    entry: { id, ...doc },
    user,
    namespace,
  }: {
    entry: Omit<KnowledgeBaseEntry, '@timestamp'>;
    user?: { name: string; id?: string };
    namespace?: string;
  }): Promise<void> => {
    if (!this.dependencies.enabled) {
      return;
    }

    try {
      await this.dependencies.esClient.asInternalUser.index({
        index: resourceNames.aliases.kb,
        id,
        document: {
          '@timestamp': new Date().toISOString(),
          ...doc,
          user,
          namespace,
        },
        pipeline: resourceNames.pipelines.kb,
        refresh: 'wait_for',
      });
    } catch (error) {
      if (error instanceof errors.ResponseError && error.body.error.type === 'status_exception') {
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
    }
  };

  deleteEntry = async ({ id }: { id: string }): Promise<void> => {
    try {
      await this.dependencies.esClient.asInternalUser.delete({
        index: resourceNames.aliases.kb,
        id,
        refresh: 'wait_for',
      });

      return Promise.resolve();
    } catch (error) {
      if (isModelMissingOrUnavailableError(error)) {
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
    }
  };
}
