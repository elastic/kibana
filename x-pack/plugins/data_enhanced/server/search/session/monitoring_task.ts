/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { Duration } from 'moment';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  RunContext,
} from '../../../../task_manager/server';
import { checkRunningSessions } from './check_running_sessions';
import { CoreSetup, SavedObjectsClient, Logger } from '../../../../../../src/core/server';
import { ConfigSchema } from '../../../config';
import { SEARCH_SESSION_TYPE } from '../../../common';

export const SEARCH_SESSIONS_TASK_TYPE = 'search_sessions_monitor';
export const SEARCH_SESSIONS_TASK_ID = `data_enhanced_${SEARCH_SESSIONS_TASK_TYPE}`;

interface SearchSessionTaskDeps {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  config$: Observable<ConfigSchema>;
}

function searchSessionRunner(core: CoreSetup, { logger, config$ }: SearchSessionTaskDeps) {
  return ({ taskInstance }: RunContext) => {
    return {
      async run() {
        const config = await config$.pipe(first()).toPromise();
        const sessionConfig = config.search.sessions;
        const [coreStart] = await core.getStartServices();
        const internalRepo = coreStart.savedObjects.createInternalRepository([SEARCH_SESSION_TYPE]);
        const internalSavedObjectsClient = new SavedObjectsClient(internalRepo);
        await checkRunningSessions(
          {
            savedObjectsClient: internalSavedObjectsClient,
            client: coreStart.elasticsearch.client.asInternalUser,
            logger,
          },
          sessionConfig
        );

        return {
          state: {},
        };
      },
    };
  };
}

export function registerSearchSessionsTask(core: CoreSetup, deps: SearchSessionTaskDeps) {
  deps.taskManager.registerTaskDefinitions({
    [SEARCH_SESSIONS_TASK_TYPE]: {
      title: 'Search Sessions Monitor',
      createTaskRunner: searchSessionRunner(core, deps),
    },
  });
}

export async function scheduleSearchSessionsTasks(
  taskManager: TaskManagerStartContract,
  logger: Logger,
  trackingInterval: Duration
) {
  await taskManager.removeIfExists(SEARCH_SESSIONS_TASK_ID);

  try {
    await taskManager.ensureScheduled({
      id: SEARCH_SESSIONS_TASK_ID,
      taskType: SEARCH_SESSIONS_TASK_TYPE,
      schedule: {
        interval: `${trackingInterval.asSeconds()}s`,
      },
      state: {},
      params: {},
    });

    logger.debug(`Search sessions task, scheduled to run`);
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}
