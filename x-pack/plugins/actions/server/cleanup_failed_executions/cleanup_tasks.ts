/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  ElasticsearchClient,
  SavedObjectsFindResult,
  SavedObjectsSerializer,
} from '@kbn/core/server';
import { TaskInstance } from '@kbn/task-manager-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  bulkDelete,
  extractBulkResponseDeleteFailures,
  getRawActionTaskParamsIdFromTask,
} from './lib';

export interface CleanupTasksOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  tasks: Array<SavedObjectsFindResult<TaskInstance>>;
  spaces?: SpacesPluginStart;
  savedObjectsSerializer: SavedObjectsSerializer;
  kibanaIndex: string;
  taskManagerIndex: string;
}

export interface CleanupTasksResult {
  success: boolean;
  successCount: number;
  failureCount: number;
}

/**
 * Cleanup tasks
 *
 * This function receives action execution tasks that are in a failed state, removes
 * the linked "action_task_params" object first and then if successful, the task manager's task.
 */
export async function cleanupTasks({
  logger,
  esClient,
  tasks,
  spaces,
  savedObjectsSerializer,
  kibanaIndex,
  taskManagerIndex,
}: CleanupTasksOpts): Promise<CleanupTasksResult> {
  const deserializedTasks = tasks.map((task) => ({
    ...task,
    attributes: {
      ...task.attributes,
      params:
        typeof task.attributes.params === 'string'
          ? JSON.parse(task.attributes.params)
          : task.attributes.params || {},
    },
  }));

  // Remove accumulated action task params
  const actionTaskParamIdsToDelete = deserializedTasks.map((task) =>
    getRawActionTaskParamsIdFromTask({ task, spaces, savedObjectsSerializer })
  );
  const actionTaskParamBulkDeleteResult = await bulkDelete(
    esClient,
    kibanaIndex,
    actionTaskParamIdsToDelete
  );
  const failedActionTaskParams = actionTaskParamBulkDeleteResult
    ? extractBulkResponseDeleteFailures(actionTaskParamBulkDeleteResult)
    : [];
  if (failedActionTaskParams?.length) {
    logger.debug(
      `Failed to delete the following action_task_params [${JSON.stringify(
        failedActionTaskParams
      )}]`
    );
  }

  // Remove accumulated tasks
  const taskIdsToDelete = deserializedTasks
    .map((task) => {
      const rawId = getRawActionTaskParamsIdFromTask({ task, spaces, savedObjectsSerializer });
      // Avoid removing tasks that failed to remove linked objects
      if (failedActionTaskParams?.find((item) => item._id === rawId)) {
        return null;
      }
      const rawTaskId = savedObjectsSerializer.generateRawId(undefined, 'task', task.id);
      return rawTaskId;
    })
    .filter((id) => !!id) as string[];
  const taskBulkDeleteResult = await bulkDelete(esClient, taskManagerIndex, taskIdsToDelete);
  const failedTasks = taskBulkDeleteResult
    ? extractBulkResponseDeleteFailures(taskBulkDeleteResult)
    : [];
  if (failedTasks?.length) {
    logger.debug(`Failed to delete the following tasks [${JSON.stringify(failedTasks)}]`);
  }

  return {
    success: failedActionTaskParams?.length === 0 && failedTasks.length === 0,
    successCount: tasks.length - failedActionTaskParams.length - failedTasks.length,
    failureCount: failedActionTaskParams.length + failedTasks.length,
  };
}
