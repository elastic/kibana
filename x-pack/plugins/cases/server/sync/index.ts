/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { Syncer } from '../services/sync/task_service';

export const CASES_SYNC_TASK_NAME = 'cases-sync-task';

export const createSyncingTask = async ({
  taskManager,
  syncer,
  logger,
}: {
  taskManager: TaskManagerSetupContract;
  syncer: Syncer;
  logger: Logger;
}) => {
  taskManager.registerTaskDefinitions({
    [CASES_SYNC_TASK_NAME]: {
      title: 'Sync Cases Data',
      createTaskRunner: () => {
        return {
          run: async () => {
            try {
              await syncer.run();
            } catch (error) {
              logger.error(`Error occurred while running sync: ${error}`);
              throw error;
            }
          },
          cancel: async () => {},
        };
      },
    },
  });
};
