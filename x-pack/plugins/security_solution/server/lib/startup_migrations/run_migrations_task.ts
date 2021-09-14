/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '../../../../../../src/core/server';
import { TaskManagerStartContract } from '../../../../task_manager/server';
import { STARTUP_MIGRATIONS } from './constants';

export interface RunMigrationsTaskOptions {
  logger: Logger;
  taskManager: TaskManagerStartContract;
}

export const runMigrationsTask = async ({
  logger,
  taskManager,
}: RunMigrationsTaskOptions): Promise<void> => {
  try {
    await taskManager.removeIfExists(STARTUP_MIGRATIONS);
    await taskManager.ensureScheduled({
      id: STARTUP_MIGRATIONS,
      taskType: STARTUP_MIGRATIONS,
      scope: ['security_solution:migrations'],
      params: {},
      state: {},
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '(unknown)';
    logger.error(`Error running migration task ${errorMessage}`);
  }
};
