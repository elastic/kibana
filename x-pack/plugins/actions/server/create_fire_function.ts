/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/legacy/server/saved_objects';
import { TASK_MANAGER_SCOPE } from '../common/constants';
import { TaskManager } from '../../task_manager';

interface CreateFireFunctionOptions {
  taskManager: TaskManager;
  savedObjectsClient: SavedObjectsClientContract;
}

interface FireOptions {
  id: string;
  params: Record<string, any>;
  namespace?: string;
}

export function createFireFunction({ taskManager, savedObjectsClient }: CreateFireFunctionOptions) {
  return async function fire({ id, params, namespace }: FireOptions) {
    const actionSavedObject = await savedObjectsClient.get('action', id, { namespace });
    await taskManager.schedule({
      taskType: `actions:${actionSavedObject.attributes.actionTypeId}`,
      params: {
        id,
        namespace,
        actionTypeParams: params,
      },
      state: {},
      scope: [TASK_MANAGER_SCOPE],
    });
  };
}
