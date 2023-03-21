/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { TaskStore } from '../task_store';

/**
 * Removes a task from the store, ignoring a not found error
 * Other errors are re-thrown
 *
 * @param taskStore
 * @param taskIds
 */
export async function bulkRemoveIfExist(taskStore: TaskStore, taskIds: string[]) {
  try {
    return await taskStore.bulkRemove(taskIds);
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      throw err;
    }
  }
}
