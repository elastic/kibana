/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';
import { TaskInstance } from '@kbn/task-manager-plugin/server';

export async function scheduleTaskSafe(
  taskManager: TaskManagerStartContract,
  taskConfig: Required<TaskInstance>,
  logger: Logger
): Promise<boolean> {
  try {
    await taskManager.ensureScheduled(taskConfig);
    logger.info(`task: ${taskConfig.id} is scheduled`);
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
    logger.info(`Task: ${taskId} removed`);
  } catch (errMsg) {
    logger.error(`Failed to remove task: ${taskId}`);
    return false;
  }

  return true;
}
