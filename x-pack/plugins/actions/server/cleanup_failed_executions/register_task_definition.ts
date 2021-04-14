/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TASK_TYPE } from './constants';
import { taskRunner, TaskRunnerOpts } from './task_runner';
import { TaskManagerSetupContract } from '../../../task_manager/server';

export function registerTaskDefinition(
  taskManager: TaskManagerSetupContract,
  taskRunnerOpts: TaskRunnerOpts
) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Cleanup failed action executions',
      createTaskRunner: taskRunner(taskRunnerOpts),
    },
  });
}
