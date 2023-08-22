/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import type { QueryDslTextExpansionQuery } from '@elastic/elasticsearch/lib/api/types';
import { serverUnavailable } from '@hapi/boom';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import pLimit from 'p-limit';
import pRetry from 'p-retry';
import { map } from 'lodash';
import { INDEX_QUEUED_DOCUMENTS_TASK_ID, INDEX_QUEUED_DOCUMENTS_TASK_TYPE } from '..';
import type { KnowledgeBaseEntry } from '../../../common/types';
import type { ObservabilityAIAssistantResourceNames } from '../types';
import { getAccessQuery } from '../util/get_access_query';

interface Dependencies {
  esClient: ElasticsearchClient;
  resources: ObservabilityAIAssistantResourceNames;
  logger: Logger;
  taskManagerStart: TaskManagerStartContract;
}

const ELSER_MODEL_ID = '.elser_model_1';

function throwKnowledgeBaseNotReady(body: any) {
  throw serverUnavailable(`Knowledge base is not ready yet`, body);
}

export enum KnowledgeBaseEntryOperationType {
  Index = 'index',
  Delete = 'delete',
}

interface KnowledgeBaseDeleteOperation {
  type: KnowledgeBaseEntryOperationType.Delete;
  id?: string;
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
              ...(operation.id ? [{ term: { _id: operation.id } }] : []),
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

    await this.summarise({
      entry: operation.document,
    });
  }

  async processQueue() {
    if (!this._queue.length) {
      return;
    }

    if (!(await this.status()).ready) {
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

  recall = async ({
    user,
    query,
    namespace,
  }: {
    query: string;
    user: { name: string };
    namespace: string;
  }): Promise<{ entries: Array<Pick<KnowledgeBaseEntry, 'text' | 'id'>> }> => {
    try {
      const response = await this.dependencies.esClient.search<
        Pick<KnowledgeBaseEntry, 'text' | 'id'>
      >({
        index: this.dependencies.resources.aliases.kb,
        query: {
          bool: {
            should: [
              {
                text_expansion: {
                  'ml.tokens': {
                    model_text: query,
                    model_id: '.elser_model_1',
                  },
                } as unknown as QueryDslTextExpansionQuery,
              },
            ],
            filter: [
              ...getAccessQuery({
                user,
                namespace,
              }),
            ],
          },
        },
        size: 3,
        _source: {
          includes: ['text', 'id'],
        },
      });

      return { entries: response.hits.hits.map((hit) => ({ ...hit._source!, score: hit._score })) };
    } catch (error) {
      if (
        (error instanceof errors.ResponseError &&
          error.body.error.type === 'resource_not_found_exception') ||
        error.body.error.type === 'status_exception'
      ) {
        throwKnowledgeBaseNotReady(error.body);
      }
      throw error;
    }
  };

  summarise = async ({
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

  status = async () => {
    try {
      const modelStats = await this.dependencies.esClient.ml.getTrainedModelsStats({
        model_id: ELSER_MODEL_ID,
      });
      const elserModelStats = modelStats.trained_model_stats[0];
      const deploymentState = elserModelStats.deployment_stats?.state;
      const allocationState = elserModelStats.deployment_stats?.allocation_status.state;
      return {
        ready: deploymentState === 'started' && allocationState === 'fully_allocated',
        deployment_state: deploymentState,
        allocation_state: allocationState,
      };
    } catch (error) {
      return {
        error: error instanceof errors.ResponseError ? error.body.error : String(error),
        ready: false,
      };
    }
  };

  setup = async () => {
    // if this fails, it's fine to propagate the error to the user

    const installModel = async () => {
      this.dependencies.logger.info('Installing ELSER model');
      await this.dependencies.esClient.ml.putTrainedModel(
        {
          model_id: ELSER_MODEL_ID,
          input: {
            field_names: ['text_field'],
          },
          // @ts-expect-error
          wait_for_completion: true,
        },
        { requestTimeout: '20m' }
      );
      this.dependencies.logger.info('Finished installing ELSER model');
    };

    try {
      const getResponse = await this.dependencies.esClient.ml.getTrainedModels({
        model_id: ELSER_MODEL_ID,
        include: 'definition_status',
      });

      if (!getResponse.trained_model_configs[0]?.fully_defined) {
        this.dependencies.logger.info('Model is not fully defined');
        await installModel();
      }
    } catch (error) {
      if (
        error instanceof errors.ResponseError &&
        error.body.error.type === 'resource_not_found_exception'
      ) {
        await installModel();
      } else {
        throw error;
      }
    }

    try {
      await this.dependencies.esClient.ml.startTrainedModelDeployment({
        model_id: ELSER_MODEL_ID,
        wait_for: 'fully_allocated',
      });
    } catch (error) {
      this.dependencies.logger.debug('Error starting model deployment');
      this.dependencies.logger.debug(error);
      if (
        !(
          (error instanceof errors.ResponseError && error.body.error.type === 'status_exception') ||
          error.body.error.type === 'resource_not_found_exception'
        )
      ) {
        throw error;
      }
    }

    await pRetry(
      async () => {
        const response = await this.dependencies.esClient.ml.getTrainedModelsStats({
          model_id: ELSER_MODEL_ID,
        });

        if (
          response.trained_model_stats[0]?.deployment_stats?.allocation_status.state ===
          'fully_allocated'
        ) {
          return Promise.resolve();
        }

        this.dependencies.logger.debug('Model is not allocated yet');
        this.dependencies.logger.debug(JSON.stringify(response));

        return Promise.reject(new Error('Not Ready'));
      },
      { factor: 1, minTimeout: 10000, maxRetryTime: 20 * 60 * 1000 }
    );

    this.dependencies.logger.info('Model is ready');
    this.ensureTaskScheduled();
  };
}
