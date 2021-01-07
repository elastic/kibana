/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TaskManagerStartContract } from '../';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';

export async function deleteTaskIfItExists(
  removeFn: TaskManagerStartContract['remove'],
  taskId: string
) {
  try {
    await removeFn(taskId);
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      throw err;
    }
  }
}
