/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { ActionsConfigurationUtilities } from '../actions_config';

export async function hasReachedTheQueuedActionsLimit(
  taskManager: TaskManagerStartContract,
  configurationUtilities: ActionsConfigurationUtilities,
  numberOfActions: number
) {
  const limit = configurationUtilities.getMaxQueued();
  const {
    hits: { total },
  } = await taskManager.aggregate({
    query: {
      bool: {
        filter: {
          bool: {
            must: [
              {
                term: {
                  'task.scope': 'actions',
                },
              },
            ],
          },
        },
      },
    },
    aggs: {},
  });
  const tasks = typeof total === 'number' ? total : total?.value ?? 0;
  const numberOfTasks = tasks + numberOfActions;
  const hasReachedLimit = numberOfTasks >= limit;
  return {
    hasReachedLimit,
    numberOverLimit: hasReachedLimit ? numberOfTasks - limit : 0,
  };
}
