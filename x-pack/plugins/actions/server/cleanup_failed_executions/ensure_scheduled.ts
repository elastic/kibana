/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { TaskManagerStartContract, asInterval } from '@kbn/task-manager-plugin/server';
import { TASK_ID, TASK_TYPE } from './constants';
import { ActionsConfig } from '../config';

export async function ensureScheduled(
  taskManager: TaskManagerStartContract,
  logger: Logger,
  { cleanupInterval }: ActionsConfig['cleanupFailedExecutionsTask']
) {
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: {
        interval: asInterval(cleanupInterval.asMilliseconds()),
      },
      state: {
        runs: 0,
        total_cleaned_up: 0,
      },
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${TASK_ID}, received ${e.message}`);
  }
}
