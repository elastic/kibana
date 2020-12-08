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
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';

export const BACKGROUND_SESSIONS_TASK_TYPE = 'bg_monitor';
export const BACKGROUND_SESSIONS_TASK_ID = `data_enhanced_${BACKGROUND_SESSIONS_TASK_TYPE}`;
export const MONITOR_INTERVAL = `15s`;

function backgroundSessionRunner(core: CoreSetup, logger: Logger) {
  return ({ taskInstance }: RunContext) => {
    return {
      async run() {
        const [coreStart] = await core.getStartServices();
        const internalRepo = coreStart.savedObjects.createInternalRepository([
          BACKGROUND_SESSION_TYPE,
        ]);
        const internalSavedObjectsClient = new SavedObjectsClient(internalRepo);
        await checkRunningSessions(
          internalSavedObjectsClient,
          coreStart.elasticsearch.client.asInternalUser,
          logger
        );

        return {
          runAt: new Date(Date.now() + 10 * 1000),
          state: {},
        };
      },
    };
  };
}

export function registerBackgroundSessionsTask(
  core: CoreSetup,
  taskManager: TaskManagerSetupContract,
  logger: Logger
) {
  taskManager.registerTaskDefinitions({
    [BACKGROUND_SESSIONS_TASK_TYPE]: {
      title: 'Background Session Monitor',
      createTaskRunner: backgroundSessionRunner(core, logger),
    },
  });
}

export async function scheduleBackgroundSessionsTasks(
  taskManager: TaskManagerStartContract,
  logger: Logger
) {
  try {
    // delete previous task
    await taskManager.remove(BACKGROUND_SESSIONS_TASK_ID);
  } catch (e) {} // eslint-disable-line no-empty

  try {
    await taskManager.ensureScheduled({
      id: BACKGROUND_SESSIONS_TASK_ID,
      taskType: BACKGROUND_SESSIONS_TASK_TYPE,
      schedule: {
        interval: MONITOR_INTERVAL,
      },
      state: {},
      params: {},
    });

    logger.debug(`Background search task, scheduled to run`);
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}
