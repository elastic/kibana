/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration } from 'moment';
import { filter, takeUntil } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  RunContext,
  TaskRunCreatorFunction,
} from '../../../../task_manager/server';
import { checkRunningSessions } from './check_running_sessions';
import { CoreSetup, SavedObjectsClient, Logger } from '../../../../../../src/core/server';
import { ConfigSchema } from '../../../config';
import { SEARCH_SESSION_TYPE } from '../../../../../../src/plugins/data/common';
import { DataEnhancedStartDependencies } from '../../type';

export const SEARCH_SESSIONS_TASK_TYPE = 'search_sessions_monitor';
export const SEARCH_SESSIONS_TASK_ID = `data_enhanced_${SEARCH_SESSIONS_TASK_TYPE}`;

interface SearchSessionTaskDeps {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  config: ConfigSchema;
}

function searchSessionRunner(
  core: CoreSetup<DataEnhancedStartDependencies>,
  { logger, config }: SearchSessionTaskDeps
): TaskRunCreatorFunction {
  return ({ taskInstance }: RunContext) => {
    const aborted$ = new BehaviorSubject<boolean>(false);
    return {
      async run() {
        const sessionConfig = config.search.sessions;
        const [coreStart] = await core.getStartServices();
        if (!sessionConfig.enabled) {
          logger.debug('Search sessions are disabled. Skipping task.');
          return;
        }
        if (aborted$.getValue()) return;

        const internalRepo = coreStart.savedObjects.createInternalRepository([SEARCH_SESSION_TYPE]);
        const internalSavedObjectsClient = new SavedObjectsClient(internalRepo);
        await checkRunningSessions(
          {
            savedObjectsClient: internalSavedObjectsClient,
            client: coreStart.elasticsearch.client.asInternalUser,
            logger,
          },
          sessionConfig
        )
          .pipe(takeUntil(aborted$.pipe(filter((aborted) => aborted))))
          .toPromise();

        return {
          state: {},
        };
      },
      cancel: async () => {
        aborted$.next(true);
      },
    };
  };
}

export function registerSearchSessionsTask(
  core: CoreSetup<DataEnhancedStartDependencies>,
  deps: SearchSessionTaskDeps
) {
  deps.taskManager.registerTaskDefinitions({
    [SEARCH_SESSIONS_TASK_TYPE]: {
      title: 'Search Sessions Monitor',
      createTaskRunner: searchSessionRunner(core, deps),
      timeout: `${deps.config.search.sessions.monitoringTaskTimeout.asSeconds()}s`,
    },
  });
}

export async function unscheduleSearchSessionsTask(
  taskManager: TaskManagerStartContract,
  logger: Logger
) {
  try {
    await taskManager.removeIfExists(SEARCH_SESSIONS_TASK_ID);
    logger.debug(`Search sessions cleared`);
  } catch (e) {
    logger.error(`Error clearing task, received ${e.message}`);
  }
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
    logger.error(`Error scheduling task, received ${e.message}`);
  }
}
