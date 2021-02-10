/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerStartContract } from '../../../task_manager/server';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';

export async function deleteTaskIfItExists(taskManager: TaskManagerStartContract, taskId: string) {
  try {
    await taskManager.remove(taskId);
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      throw err;
    }
  }
}
