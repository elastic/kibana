/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  RunContext,
} from '../../../../task_manager/server';
import { checkRunningSessions } from './check_running_sessions';
import { CoreSetup, SavedObjectsClient, Logger } from '../../../../../../src/core/server';
import { SEARCH_SESSION_TYPE } from '../../saved_objects';

export const SEARCH_SESSIONS_TASK_TYPE = 'bg_monitor';
export const SEARCH_SESSIONS_TASK_ID = `data_enhanced_${SEARCH_SESSIONS_TASK_TYPE}`;
export const MONITOR_INTERVAL = 15; // in seconds

function searchSessionRunner(core: CoreSetup, logger: Logger) {
  return ({ taskInstance }: RunContext) => {
    return {
      async run() {
        const [coreStart] = await core.getStartServices();
        const internalRepo = coreStart.savedObjects.createInternalRepository([SEARCH_SESSION_TYPE]);
        const internalSavedObjectsClient = new SavedObjectsClient(internalRepo);
        await checkRunningSessions(
          internalSavedObjectsClient,
          coreStart.elasticsearch.client.asInternalUser,
          logger
        );

        return {
          runAt: new Date(Date.now() + MONITOR_INTERVAL * 1000),
          state: {},
        };
      },
    };
  };
}

export function registerSearchSessionsTask(
  core: CoreSetup,
  taskManager: TaskManagerSetupContract,
  logger: Logger
) {
  taskManager.registerTaskDefinitions({
    [SEARCH_SESSIONS_TASK_TYPE]: {
      title: 'Search Sessions Monitor',
      createTaskRunner: searchSessionRunner(core, logger),
    },
  });
}

export async function scheduleSearchSessionsTasks(
  taskManager: TaskManagerStartContract,
  logger: Logger
) {
  await taskManager.removeIfExists(SEARCH_SESSIONS_TASK_ID);

  try {
    await taskManager.ensureScheduled({
      id: SEARCH_SESSIONS_TASK_ID,
      taskType: SEARCH_SESSIONS_TASK_TYPE,
      schedule: {
        interval: `${MONITOR_INTERVAL}s`,
      },
      state: {},
      params: {},
    });

    logger.debug(`Background search task, scheduled to run`);
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}
