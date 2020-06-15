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
import { checkBackgoundSessions } from './check_sessions';
import { CoreSetup, SavedObjectsClient, Logger } from '../../../../../../src/core/server';

export const BACKGROUND_SESSIONS_TASK_TYPE = 'bg_monitor';
export const BACKGROUND_SESSIONS_TASK_ID = `data_enhanced_${BACKGROUND_SESSIONS_TASK_TYPE}`;

function backgroundSessionRunner(core: CoreSetup, logger: Logger) {
  logger.debug(`Registering background search task`);
  return ({ taskInstance }: RunContext) => {
    return {
      async run() {
        logger.debug('Background sessions task started');
        const [coreStart] = await core.getStartServices();
        const internalRepo = coreStart.savedObjects.createInternalRepository();
        const internalSavedObjectsClient = new SavedObjectsClient(internalRepo);
        await checkBackgoundSessions(
          internalSavedObjectsClient,
          logger,
          core.elasticsearch.legacy.client.callAsInternalUser
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
      type: BACKGROUND_SESSIONS_TASK_TYPE,
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
    const deleteResult = await taskManager.remove(BACKGROUND_SESSIONS_TASK_ID);
    logger.debug(JSON.stringify(deleteResult, null, 2));
  } catch (e) {
    // eslint-disable-line no-empty
  }

  try {
    const result = await taskManager.ensureScheduled({
      id: BACKGROUND_SESSIONS_TASK_ID,
      taskType: BACKGROUND_SESSIONS_TASK_TYPE,
      schedule: {
        interval: '15s',
      },
      state: {},
      params: {},
    });

    logger.debug(JSON.stringify(result, null, 2));
    logger.debug(`Background search task, scheduled to run`);
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}
