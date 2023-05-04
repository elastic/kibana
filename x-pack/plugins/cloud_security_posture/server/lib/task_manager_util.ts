/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';
import type { TaskInstance } from '@kbn/task-manager-plugin/server';

type Require<T extends object, P extends keyof T> = Omit<T, P> & Required<Pick<T, P>>;
type TaskInstanceWithId = Require<TaskInstance, 'id'>;

export async function scheduleTaskSafe(
  taskManager: TaskManagerStartContract,
  taskConfig: TaskInstanceWithId,
  logger: Logger
): Promise<boolean> {
  try {
    await taskManager.ensureScheduled(taskConfig);
    logger.info(`Scheduled task successfully [Task: ${taskConfig.id}]`);
  } catch (errMsg) {
    const error = transformError(errMsg);
    logger.error(`Error scheduling task, received ${error.message}`);
    return false;
  }

  return true;
}

export async function removeTaskSafe(
  taskManager: TaskManagerStartContract,
  taskId: string,
  logger: Logger
): Promise<boolean> {
  try {
    await taskManager.remove(taskId);
    logger.info(`Deleted task successfully [Task: ${taskId}]`);
  } catch (errMsg) {
    logger.error(`Failed to remove task: ${taskId}`);
    return false;
  }

  return true;
}
