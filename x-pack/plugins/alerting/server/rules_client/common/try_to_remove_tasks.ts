/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

export const tryToRemoveTasks = async ({
  taskIdsToDelete,
  logger,
  taskManager,
}: {
  taskIdsToDelete: string[];
  logger: Logger;
  taskManager: TaskManagerStartContract;
}) => {
  const taskIdsFailedToBeDeleted: string[] = [];
  const taskIdsSuccessfullyDeleted: string[] = [];
  return await withSpan({ name: 'taskManager.bulkRemoveIfExist', type: 'rules' }, async () => {
    if (taskIdsToDelete.length > 0) {
      try {
        const resultFromDeletingTasks = await taskManager.bulkRemoveIfExist(taskIdsToDelete);
        resultFromDeletingTasks?.statuses.forEach((status) => {
          if (status.success) {
            taskIdsSuccessfullyDeleted.push(status.id);
          } else {
            taskIdsFailedToBeDeleted.push(status.id);
          }
        });
        if (taskIdsSuccessfullyDeleted.length) {
          logger.debug(
            `Successfully deleted schedules for underlying tasks: ${taskIdsSuccessfullyDeleted.join(
              ', '
            )}`
          );
        }
        if (taskIdsFailedToBeDeleted.length) {
          logger.error(
            `Failure to delete schedules for underlying tasks: ${taskIdsFailedToBeDeleted.join(
              ', '
            )}`
          );
        }
      } catch (error) {
        logger.error(
          `Failure to delete schedules for underlying tasks: ${taskIdsToDelete.join(
            ', '
          )}. TaskManager bulkRemoveIfExist failed with Error: ${error.message}`
        );
      }
    }
    return taskIdsFailedToBeDeleted;
  });
};
