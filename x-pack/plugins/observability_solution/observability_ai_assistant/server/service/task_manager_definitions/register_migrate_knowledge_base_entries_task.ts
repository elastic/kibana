/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import pLimit from 'p-limit';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { Logger } from '@kbn/core/server';
import { KnowledgeBaseEntry } from '../../../common';
import { resourceNames } from '..';

const TASK_ID = 'ai-assistant-knowledge-base-migration-task-id';
const TASK_TYPE = 'ai-assistant-knowledge-base-migration-task';

// This task will re-index all knowledge base entries without `semantic_text` field
// to ensure the field is populated with the correct embeddings.
// After the migration we will no longer need to use the `ml.tokens` field.
export async function registerMigrateKnowledgeBaseEntriesTask({
  taskManager,
  logger,
  getEsClient,
  getTaskManagerStart,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  getEsClient: () => Promise<ElasticsearchClient>;
  getTaskManagerStart: () => Promise<TaskManagerStartContract>;
}) {
  logger.debug(`Register task "${TASK_TYPE}"`);
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Migrate AI Assistant Knowledge Base',
      description: `Migrates AI Assistant knowledge base entries`,
      timeout: '1h',
      maxAttempts: 5,
      createTaskRunner() {
        const taskState: TaskState = { isAborted: false };

        return {
          async run() {
            logger.debug(`Run task: "${TASK_TYPE}"`);
            const esClient = await getEsClient();
            await runKnowledgeBaseMigration({ taskState, esClient, logger });
          },

          async cancel() {
            taskState.isAborted = true;
            logger.debug(`Task cancelled: "${TASK_TYPE}"`);
          },
        };
      },
    },
  });

  const taskManagerStart = await getTaskManagerStart();

  logger.debug(`Scheduled task: "${TASK_TYPE}"`);
  await taskManagerStart.ensureScheduled({
    id: TASK_ID,
    taskType: TASK_TYPE,
    scope: ['aiAssistant'],
    params: {},
    state: {},
  });
}

interface TaskState {
  isAborted: boolean;
}

export async function runKnowledgeBaseMigration({
  taskState,
  esClient,
  logger,
}: {
  taskState?: TaskState;
  esClient: ElasticsearchClient;
  logger: Logger;
}) {
  if (taskState?.isAborted) {
    throw new Error('Task is aborted');
  }

  try {
    const response = await esClient.search<KnowledgeBaseEntry>({
      size: 100,
      track_total_hits: true,
      index: [resourceNames.aliases.kb],
      query: {
        bool: {
          must_not: {
            exists: {
              field: 'semantic_text',
            },
          },
        },
      },
      _source: {
        excludes: ['ml.tokens'],
      },
    });

    if (response.hits.hits.length === 0) {
      logger.debug('Knowledge base migration: No remaining entries to migrate');
      return;
    }

    // Limit the number of concurrent requests to avoid overloading the cluster
    const limiter = pLimit(10);
    const promises = response.hits.hits.map((hit) => {
      return limiter(() => {
        if (!hit._source) {
          return;
        }

        return esClient.update({
          index: resourceNames.aliases.kb,
          id: hit._id,
          body: {
            doc: {
              ...hit._source,
              semantic_text: hit._source.text,
            },
          },
        });
      });
    });

    await Promise.all(promises);
    logger.debug(`Knowledge base migration: Migrated ${promises.length} entries`);
    await runKnowledgeBaseMigration({ taskState, esClient, logger });
  } catch (e) {
    logger.error('Knowledge base migration: Failed to migrate entries');
    logger.error(e);
  }
}
