/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import { serverUnavailable } from '@hapi/boom';
import type { ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import pLimit from 'p-limit';
import { isEmpty, map, orderBy } from 'lodash';
import { encode } from 'gpt-tokenizer';
import { aiAssistantSearchConnectorIndexPattern } from '../../../common';
import { resourceNames } from '..';
import { KnowledgeBaseEntry, KnowledgeBaseEntryRole, UserInstruction } from '../../../common/types';
import { getAccessQuery } from '../util/get_access_query';
import { getCategoryQuery } from '../util/get_category_query';
import {
  createInferenceEndpoint,
  deleteInferenceEndpoint,
  getInferenceEndpoint,
} from '../create_inference_endpoint';

interface Dependencies {
  esClient: {
    asInternalUser: ElasticsearchClient;
  };
  logger: Logger;
  taskManagerStart: TaskManagerStartContract;
  getModelId: () => Promise<string>;
}

export interface RecalledEntry {
  id: string;
  text: string;
  score: number | null;
  is_correction?: boolean;
  labels?: Record<string, string>;
}

function isNotFoundError(error: Error) {
  return (
    error instanceof errors.ResponseError &&
    (error.body.error.type === 'resource_not_found_exception' ||
      error.body.error.type === 'status_exception')
  );
}

function throwKnowledgeBaseNotReady(body: any) {
  throw serverUnavailable(`Knowledge base is not ready yet`, body);
}

export enum KnowledgeBaseEntryOperationType {
  Index = 'index',
  Delete = 'delete',
}

interface KnowledgeBaseDeleteOperation {
  type: KnowledgeBaseEntryOperationType.Delete;
  doc_id?: string;
  labels?: Record<string, string>;
}

interface KnowledgeBaseIndexOperation {
  type: KnowledgeBaseEntryOperationType.Index;
  document: KnowledgeBaseEntry;
}

export type KnowledgeBaseEntryOperation =
  | KnowledgeBaseDeleteOperation
  | KnowledgeBaseIndexOperation;

export class KnowledgeBaseService {
  private hasSetup: boolean = false;

  private _queue: KnowledgeBaseEntryOperation[] = [];

  constructor(private readonly dependencies: Dependencies) {}

  private async processOperation(operation: KnowledgeBaseEntryOperation) {
    if (operation.type === KnowledgeBaseEntryOperationType.Delete) {
      await this.dependencies.esClient.asInternalUser.deleteByQuery({
        index: resourceNames.aliases.kb,
        query: {
          bool: {
            filter: [
              ...(operation.doc_id ? [{ term: { _id: operation.doc_id } }] : []),
              ...(operation.labels
                ? map(operation.labels, (value, key) => {
                    return { term: { [key]: value } };
                  })
                : []),
            ],
          },
        },
      });
      return;
    }

    await this.addEntry({
      entry: operation.document,
    });
  }

  async setup(esClient: { asCurrentUser: ElasticsearchClient }) {
    return createInferenceEndpoint({ esClient, logger: this.dependencies.logger });
  }

  async reset(esClient: { asCurrentUser: ElasticsearchClient }) {
    return deleteInferenceEndpoint({ esClient, logger: this.dependencies.logger });
  }

  async getStatus() {
    try {
      const endpoint = await getInferenceEndpoint({
        esClient: this.dependencies.esClient,
        logger: this.dependencies.logger,
      });

      return {
        ready: endpoint !== undefined,
        ...endpoint,
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return {
          ready: false,
        };
      }
      throw error;
    }
  }

  async processQueue() {
    if (!this._queue.length) {
      return;
    }

    const kbStatus = await this.getStatus();
    if (!kbStatus.ready) {
      this.dependencies.logger.debug(`Bailing on queue task: KB is not ready yet`);
      return;
    }

    this.dependencies.logger.debug(`Processing queue`);

    this.hasSetup = true;

    this.dependencies.logger.info(`Processing ${this._queue.length} queue operations`);

    const limiter = pLimit(5);

    const operations = this._queue.concat();

    await Promise.all(
      operations.map((operation) =>
        limiter(async () => {
          this._queue.splice(operations.indexOf(operation), 1);
          await this.processOperation(operation);
        })
      )
    );

    this.dependencies.logger.info('Processed all queued operations');
  }

  queue(operations: KnowledgeBaseEntryOperation[]): void {
    if (!operations.length) {
      return;
    }

    if (!this.hasSetup) {
      this._queue.push(...operations);
      return;
    }

    const limiter = pLimit(5);

    const limitedFunctions = this._queue.map((operation) =>
      limiter(() => this.processOperation(operation))
    );

    Promise.all(limitedFunctions).catch((err) => {
      this.dependencies.logger.error(`Failed to process all queued operations`);
      this.dependencies.logger.error(err);
    });
  }

  private async recallFromKnowledgeBase({
    queries,
    categories,
    namespace,
    user,
  }: {
    queries: Array<{ text: string; boost?: number }>;
    categories?: string[];
    namespace: string;
    user?: { name: string };
  }): Promise<RecalledEntry[]> {
    const esQuery = {
      bool: {
        should: queries.map(({ text, boost = 1 }) => ({
          semantic: {
            field: 'semantic_text',
            query: text,
            boost,
          },
        })),
        filter: [
          ...getAccessQuery({
            user,
            namespace,
          }),
          ...getCategoryQuery({ categories }),
        ],
      },
    };

    const response = await this.dependencies.esClient.asInternalUser.search<
      Pick<KnowledgeBaseEntry, 'text' | 'is_correction' | 'labels'>
    >({
      index: [resourceNames.aliases.kb],
      // @ts-expect-error: `semantic` is not in the types yet
      query: esQuery,
      size: 20,
      _source: {
        includes: ['text', 'is_correction', 'labels'],
      },
    });

    return response.hits.hits.map((hit) => ({
      ...hit._source!,
      score: hit._score!,
      id: hit._id,
    }));
  }

  private async getConnectorIndices(
    client: ElasticsearchClient,
    uiSettingsClient: IUiSettingsClient
  ) {
    // improve performance by running this in parallel with the `uiSettingsClient` request
    const responsePromise = client.transport.request({
      method: 'GET',
      path: '_connector',
      querystring: {
        filter_path: 'results.index_name',
      },
    });

    const customSearchConnectorIndex = await uiSettingsClient.get<string>(
      aiAssistantSearchConnectorIndexPattern
    );

    if (customSearchConnectorIndex) {
      return customSearchConnectorIndex.split(',');
    }

    const response = (await responsePromise) as { results?: Array<{ index_name: string }> };
    const connectorIndices = response.results?.map((result) => result.index_name);

    // preserve backwards compatibility with 8.14 (may not be needed in the future)
    if (isEmpty(connectorIndices)) {
      return ['search-*'];
    }

    return connectorIndices;
  }

  private async recallFromConnectors({
    queries,
    asCurrentUser,
    uiSettingsClient,
    modelId,
  }: {
    queries: Array<{ text: string; boost?: number }>;
    asCurrentUser: ElasticsearchClient;
    uiSettingsClient: IUiSettingsClient;
    modelId: string;
  }): Promise<RecalledEntry[]> {
    const ML_INFERENCE_PREFIX = 'ml.inference.';

    const connectorIndices = await this.getConnectorIndices(asCurrentUser, uiSettingsClient);

    const fieldCaps = await asCurrentUser.fieldCaps({
      index: connectorIndices,
      fields: `${ML_INFERENCE_PREFIX}*`,
      allow_no_indices: true,
      types: ['sparse_vector'],
      filters: '-metadata,-parent',
    });

    const fieldsWithVectors = Object.keys(fieldCaps.fields).map((field) =>
      field.replace('_expanded.predicted_value', '').replace(ML_INFERENCE_PREFIX, '')
    );

    if (!fieldsWithVectors.length) {
      return [];
    }

    const esQueries = fieldsWithVectors.flatMap((field) => {
      const vectorField = `${ML_INFERENCE_PREFIX}${field}_expanded.predicted_value`;
      const modelField = `${ML_INFERENCE_PREFIX}${field}_expanded.model_id`;

      return queries.map(({ text, boost = 1 }) => {
        return {
          bool: {
            should: [
              {
                text_expansion: {
                  [vectorField]: {
                    model_text: text,
                    model_id: modelId,
                    boost,
                  },
                },
              },
            ],
            filter: [
              {
                term: {
                  [modelField]: modelId,
                },
              },
            ],
          },
        };
      });
    });

    const response = await asCurrentUser.search<unknown>({
      index: connectorIndices,
      query: {
        bool: {
          should: esQueries,
        },
      },
      size: 20,
      _source: {
        exclude: ['_*', 'ml*'],
      },
    });

    const results = response.hits.hits.map((hit) => ({
      text: JSON.stringify(hit._source),
      score: hit._score!,
      is_correction: false,
      id: hit._id,
    }));

    return results;
  }

  recall = async ({
    user,
    queries,
    categories,
    namespace,
    asCurrentUser,
    uiSettingsClient,
  }: {
    queries: Array<{ text: string; boost?: number }>;
    categories?: string[];
    user?: { name: string };
    namespace: string;
    asCurrentUser: ElasticsearchClient;
    uiSettingsClient: IUiSettingsClient;
  }): Promise<{
    entries: RecalledEntry[];
  }> => {
    this.dependencies.logger.debug(
      `Recalling entries from KB for queries: "${JSON.stringify(queries)}"`
    );
    const modelId = await this.dependencies.getModelId();

    const [documentsFromKb, documentsFromConnectors] = await Promise.all([
      this.recallFromKnowledgeBase({
        user,
        queries,
        categories,
        namespace,
      }).catch((error) => {
        if (isNotFoundError(error)) {
          throwKnowledgeBaseNotReady(error.body);
        }
        throw error;
      }),
      this.recallFromConnectors({
        asCurrentUser,
        uiSettingsClient,
        queries,
        modelId,
      }).catch((error) => {
        this.dependencies.logger.debug('Error getting data from search indices');
        this.dependencies.logger.debug(error);
        return [];
      }),
    ]);

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

    return {
      entries: returnedEntries,
    };
  };

  getUserInstructions = async (
    namespace: string,
    user?: { name: string }
  ): Promise<UserInstruction[]> => {
    try {
      const response = await this.dependencies.esClient.asInternalUser.search<KnowledgeBaseEntry>({
        index: resourceNames.aliases.kb,
        query: {
          bool: {
            must: [
              {
                term: {
                  'labels.category.keyword': {
                    value: 'instruction',
                  },
                },
              },
            ],
            filter: getAccessQuery({
              user,
              namespace,
            }),
          },
        },
        size: 500,
        _source: ['doc_id', 'text'],
      });

      return response.hits.hits.map((hit) => ({
        doc_id: hit._source?.doc_id ?? '',
        text: hit._source?.text ?? '',
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
    try {
      const response = await this.dependencies.esClient.asInternalUser.search<KnowledgeBaseEntry>({
        index: resourceNames.aliases.kb,
        ...(query
          ? {
              query: {
                wildcard: {
                  doc_id: {
                    value: `${query}*`,
                  },
                },
              },
            }
          : {}),
        sort: [
          {
            [String(sortBy)]: {
              order: sortDirection,
            },
          },
        ],
        size: 500,
        _source: {
          includes: [
            'doc_id',
            'text',
            'is_correction',
            'labels',
            'confidence',
            'public',
            '@timestamp',
            'role',
            'user.name',
          ],
        },
      });

      return {
        entries: response.hits.hits.map((hit) => ({
          ...hit._source!,
          role: hit._source!.role ?? KnowledgeBaseEntryRole.UserEntry,
          score: hit._score,
          id: hit._id,
        })),
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
    }
  };

  addEntry = async ({
    entry: { id, ...document },
    user,
    namespace,
  }: {
    entry: Omit<KnowledgeBaseEntry, '@timestamp'>;
    user?: { name: string; id?: string };
    namespace?: string;
  }): Promise<void> => {
    try {
      await this.dependencies.esClient.asInternalUser.index({
        index: resourceNames.aliases.kb,
        id,
        document: {
          '@timestamp': new Date().toISOString(),
          ...document,
          semantic_text: document.text,
          user,
          namespace,
        },
        refresh: 'wait_for',
      });
    } catch (error) {
      if (error instanceof errors.ResponseError && error.body.error.type === 'status_exception') {
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
    }
  };

  addEntries = async ({
    operations,
  }: {
    operations: KnowledgeBaseEntryOperation[];
  }): Promise<void> => {
    this.dependencies.logger.info(`Starting import of ${operations.length} entries`);

    const limiter = pLimit(5);

    await Promise.all(
      operations.map((operation) =>
        limiter(async () => {
          await this.processOperation(operation);
        })
      )
    );

    this.dependencies.logger.info(`Completed import of ${operations.length} entries`);
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
      if (isNotFoundError(error)) {
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
    }
  };
}
