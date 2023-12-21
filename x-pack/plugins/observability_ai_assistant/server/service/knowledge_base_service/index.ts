/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import type { QueryDslTextExpansionQuery } from '@elastic/elasticsearch/lib/api/types';
import { serverUnavailable } from '@hapi/boom';
import {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClient,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import pLimit from 'p-limit';
import { map } from 'lodash';
import { INDEX_QUEUED_DOCUMENTS_TASK_ID, INDEX_QUEUED_DOCUMENTS_TASK_TYPE } from '..';
import { KnowledgeBaseEntry, KnowledgeBaseEntryRole } from '../../../common/types';
import type { ObservabilityAIAssistantResourceNames } from '../types';
import { getAccessQuery } from '../util/get_access_query';
import { getCategoryQuery } from '../util/get_category_query';
import { MlHelper } from '../util/ml_helper';

interface Dependencies {
  esClient: ElasticsearchClient;
  resources: ObservabilityAIAssistantResourceNames;
  logger: Logger;
  taskManagerStart: TaskManagerStartContract;
  ml: MlHelper;
  savedObjectsStart: SavedObjectsServiceStart;
}

export interface RecalledEntry {
  id: string;
  text: string;
  score: number | null;
  is_correction: boolean;
  labels: Record<string, string>;
}

function isAlreadyExistsError(error: Error) {
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

  constructor(private readonly dependencies: Dependencies) {
    this.ensureTaskScheduled();
  }

  setup = async (request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) => {
    try {
      await this.dependencies.ml.setupElser(request, savedObjectsClient);
    } catch (error) {
      throwKnowledgeBaseNotReady({
        message: error,
      });
    }

    this.ensureTaskScheduled();
  };

  private ensureTaskScheduled() {
    this.dependencies.taskManagerStart
      .ensureScheduled({
        taskType: INDEX_QUEUED_DOCUMENTS_TASK_TYPE,
        id: INDEX_QUEUED_DOCUMENTS_TASK_ID,
        state: {},
        params: {},
        schedule: {
          interval: '1h',
        },
      })
      .then(() => {
        this.dependencies.logger.debug('Scheduled queue task');
        return this.dependencies.taskManagerStart.runSoon(INDEX_QUEUED_DOCUMENTS_TASK_ID);
      })
      .then(() => {
        this.dependencies.logger.debug('Queue task ran');
      })
      .catch((err) => {
        this.dependencies.logger.error(`Failed to schedule queue task`);
        this.dependencies.logger.error(err);
      });
  }

  private async processOperation(operation: KnowledgeBaseEntryOperation) {
    if (operation.type === KnowledgeBaseEntryOperationType.Delete) {
      await this.dependencies.esClient.deleteByQuery({
        index: this.dependencies.resources.aliases.kb,
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

  async processQueue() {
    if (!this._queue.length) {
      return;
    }

    const savedObjectsRepo = this.dependencies.savedObjectsStart.createInternalRepository();
    // We make a fake request to bypass ML guards
    if (!(await this.status({} as any, new SavedObjectsClient(savedObjectsRepo))).ready) {
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

  status = async (request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) => {
    const elserStatus = await this.dependencies.ml.elserStatus(request, savedObjectsClient);

    if (elserStatus.error) {
      return {
        ready: false,
        error: elserStatus.error,
        elser: {
          modelName: elserStatus.modelName,
        },
      };
    }

    return {
      ready: elserStatus.ready,
      elser: {
        modelName: elserStatus.modelName,
        deploymentState: elserStatus.deploymentState,
        allocationState: elserStatus.allocationState,
      },
    };
  };

  recall = async ({
    user,
    queries,
    contexts,
    namespace,
  }: {
    queries: string[];
    contexts?: string[];
    user: { name: string };
    namespace: string;
  }): Promise<{
    entries: RecalledEntry[];
  }> => {
    const elserModelId = await this.dependencies.ml.recommendedElserModelId();

    try {
      const query = {
        bool: {
          should: queries.map((text) => ({
            text_expansion: {
              'ml.tokens': {
                model_text: text,
                model_id: elserModelId,
              },
            } as unknown as QueryDslTextExpansionQuery,
          })),
          filter: [
            ...getAccessQuery({
              user,
              namespace,
            }),
            ...getCategoryQuery({ contexts }),
          ],
        },
      };

      const response = await this.dependencies.esClient.search<
        Pick<KnowledgeBaseEntry, 'text' | 'is_correction' | 'labels'>
      >({
        index: [this.dependencies.resources.aliases.kb],
        query,
        size: 20,
        _source: {
          includes: ['text', 'is_correction', 'labels'],
        },
      });

      return {
        entries: response.hits.hits.map((hit) => ({
          ...hit._source!,
          score: hit._score!,
          id: hit._id,
        })),
      };
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
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
      const response = await this.dependencies.esClient.search<KnowledgeBaseEntry>({
        index: this.dependencies.resources.aliases.kb,
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
      if (isAlreadyExistsError(error)) {
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
      await this.dependencies.esClient.index({
        index: this.dependencies.resources.aliases.kb,
        id,
        document: {
          '@timestamp': new Date().toISOString(),
          ...document,
          user,
          namespace,
        },
        pipeline: this.dependencies.resources.pipelines.kb,
        refresh: false,
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
      await this.dependencies.esClient.delete({
        index: this.dependencies.resources.aliases.kb,
        id,
        refresh: 'wait_for',
      });

      return Promise.resolve();
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
    }
  };
}
