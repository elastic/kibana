/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { KnowledgeBaseService } from '../knowledge_base_service';

export const INDEX_QUEUED_DOCUMENTS_TASK_ID = 'observabilityAIAssistant:indexQueuedDocumentsTask';
export const INDEX_QUEUED_DOCUMENTS_TASK_TYPE = INDEX_QUEUED_DOCUMENTS_TASK_ID + 'Type';

export async function registerIndexQueuedDocumentsTask({
  taskManager,
  logger,
  getKbService,
  getTaskManagerStart,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  getKbService: () => KnowledgeBaseService | undefined;
  getTaskManagerStart: () => Promise<TaskManagerStartContract>;
}) {
  taskManager.registerTaskDefinitions({
    [INDEX_QUEUED_DOCUMENTS_TASK_TYPE]: {
      title: 'Index queued KB articles',
      description: 'Indexes previously registered entries into the knowledge base when it is ready',
      timeout: '30m',
      maxAttempts: 2,
      createTaskRunner: () => {
        return {
          run: async () => {
            const kbService = getKbService();
            if (kbService) {
              await kbService.processQueue();
            }
          },
        };
      },
    },
  });

  const taskManagerStart = await getTaskManagerStart();

  try {
    await taskManagerStart.ensureScheduled({
      taskType: INDEX_QUEUED_DOCUMENTS_TASK_TYPE,
      id: INDEX_QUEUED_DOCUMENTS_TASK_ID,
      scope: ['aiAssistant'],
      state: {},
      params: {},
      schedule: {
        interval: '1h',
      },
    });

    logger.debug('Scheduled queue task');
    await taskManagerStart.runSoon(INDEX_QUEUED_DOCUMENTS_TASK_ID);
    logger.debug('Queue task ran');
  } catch (e) {
    logger.error(`Failed to schedule queue task`);
    logger.error(e);
  }
}
