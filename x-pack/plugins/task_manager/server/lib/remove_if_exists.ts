/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { TaskStore } from '../task_store';

/**
 * Removes a task from the store, ignoring a not found error
 * Other errors are re-thrown
 *
 * @param taskStore
 * @param taskId
 */
export async function removeIfExists(taskStore: TaskStore, taskId: string) {
  try {
    await taskStore.remove(taskId);
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      throw err;
    }
  }
}
