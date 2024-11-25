/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { InternalServices } from '../types';
import { isTaskCurrentlyRunningError } from './utils';

export const UNINSTALL_ALL_TASK_TYPE = 'ProductDocBase:UninstallAll';
export const UNINSTALL_ALL_TASK_ID = 'ProductDocBase:UninstallAll';

export const registerUninstallAllTaskDefinition = ({
  getServices,
  taskManager,
}: {
  getServices: () => InternalServices;
  taskManager: TaskManagerSetupContract;
}) => {
  taskManager.registerTaskDefinitions({
    [UNINSTALL_ALL_TASK_TYPE]: {
      title: 'Uninstall all product documentation artifacts',
      timeout: '10m',
      maxAttempts: 3,
      createTaskRunner: (context) => {
        return {
          async run() {
            const { packageInstaller } = getServices();
            return packageInstaller.uninstallAll();
          },
        };
      },
      stateSchemaByVersion: {},
    },
  });
};

export const scheduleUninstallAllTask = async ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) => {
  try {
    await taskManager.ensureScheduled({
      id: UNINSTALL_ALL_TASK_ID,
      taskType: UNINSTALL_ALL_TASK_TYPE,
      params: {},
      state: {},
      scope: ['productDoc'],
    });

    await taskManager.runSoon(UNINSTALL_ALL_TASK_ID);

    logger.info(`Task ${UNINSTALL_ALL_TASK_ID} scheduled to run soon`);
  } catch (e) {
    if (!isTaskCurrentlyRunningError(e)) {
      throw e;
    }
  }

  return UNINSTALL_ALL_TASK_ID;
};
