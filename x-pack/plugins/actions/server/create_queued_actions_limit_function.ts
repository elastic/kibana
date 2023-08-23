/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { ActionsConfigurationUtilities } from './actions_config';

interface CreateQueuedActionsLimitFunctionOptions {
  taskManager: TaskManagerStartContract;
  configurationUtilities: ActionsConfigurationUtilities;
}

export type ReachedQueuedActionsLimit = () => Promise<boolean>;

export function createQueuedActionsLimitFunction({
  taskManager,
  configurationUtilities,
}: CreateQueuedActionsLimitFunctionOptions): ReachedQueuedActionsLimit {
  return async function execute() {
    const limit = configurationUtilities.getQueuedMax();
    const { docs: tasks } = await taskManager.fetch({
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
    });
    return tasks.length++ >= limit;
  };
}
