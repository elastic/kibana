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
} from 'kibana/server';
import { TaskInstance } from '../../../task_manager/server';
import { SpacesPluginStart } from '../../../spaces/server';
import { extractBulkResponseDeleteFailures, spaceIdToNamespace } from './lib';

interface CleanupTasksOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  tasks: Array<SavedObjectsFindResult<TaskInstance>>;
  spaces?: SpacesPluginStart;
  savedObjectsSerializer: SavedObjectsSerializer;
  kibanaIndex: string;
  taskManagerIndex: string;
}

/**
 * Cleanup tasks
 *
 * This function receives action execution tasks that are in a failed state, removes
 * the linked "action_task_params" object first and then if successful, the task manager's task.
 *
 * Returns true/false based on if the removal was completely successful.
 */
export async function cleanupTasks({
  logger,
  esClient,
  tasks,
  spaces,
  savedObjectsSerializer,
  kibanaIndex,
  taskManagerIndex,
}: CleanupTasksOpts): Promise<boolean> {
  if (tasks.length === 0) {
    logger.debug('No tasks to cleanup');
    return true;
  }

  const deserializedTasks = tasks.map((task) => ({
    ...task,
    attributes: {
      ...task.attributes,
      params: typeof task.attributes.params === 'string' ? JSON.parse(task.attributes.params) : {},
    },
  }));

  // Remove accumulated action task params
  const actionTaskParamBulkDeleteResult = await esClient.bulk({
    body: deserializedTasks.map((task) => {
      const { spaceId, actionTaskParamsId } = task.attributes.params;
      const namespace = spaceIdToNamespace(spaces, spaceId);
      const rawId = savedObjectsSerializer.generateRawId(
        namespace,
        'action_task_params',
        actionTaskParamsId
      );
      return { delete: { _index: kibanaIndex, _id: rawId } };
    }),
  });
  const failedActionTaskParams = extractBulkResponseDeleteFailures(actionTaskParamBulkDeleteResult);
  if (failedActionTaskParams.length) {
    logger.debug(
      `Failed to delete the following action_task_params [${JSON.stringify(
        failedActionTaskParams
      )}]`
    );
  }

  // Remove accumulated tasks
  const taskBulkDeleteResult = await esClient.bulk({
    body: deserializedTasks
      .map((task) => {
        const { spaceId, actionTaskParamsId } = task.attributes.params;
        const namespace = spaceIdToNamespace(spaces, spaceId);
        const rawId = savedObjectsSerializer.generateRawId(
          namespace,
          'action_task_params',
          actionTaskParamsId
        );
        if (failedActionTaskParams.find((item) => item._id === rawId)) {
          return null;
        }
        const rawTaskId = savedObjectsSerializer.generateRawId(undefined, 'task', task.id);
        return { delete: { _index: taskManagerIndex, _id: rawTaskId } };
      })
      .filter((item) => !!item),
  });
  const failedTasks = extractBulkResponseDeleteFailures(taskBulkDeleteResult);
  if (failedTasks.length) {
    logger.debug(`Failed to delete the following tasks [${JSON.stringify(failedTasks)}]`);
  }

  return failedActionTaskParams.length === 0 && failedTasks.length === 0;
}
