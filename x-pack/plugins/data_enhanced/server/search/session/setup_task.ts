/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration } from 'moment';
import { filter, takeUntil } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { RunContext, TaskRunCreatorFunction } from '@kbn/task-manager-plugin/server';
import { CoreSetup, SavedObjectsClient } from '@kbn/core/server';
import { SEARCH_SESSION_TYPE } from '@kbn/data-plugin/common';
import { DataEnhancedStartDependencies } from '../../type';
import {
  SearchSessionTaskSetupDeps,
  SearchSessionTaskStartDeps,
  SearchSessionTaskFn,
} from './types';

export function searchSessionTaskRunner(
  core: CoreSetup<DataEnhancedStartDependencies>,
  deps: SearchSessionTaskSetupDeps,
  title: string,
  checkFn: SearchSessionTaskFn
): TaskRunCreatorFunction {
  const { logger, config } = deps;
  return ({ taskInstance }: RunContext) => {
    const aborted$ = new BehaviorSubject<boolean>(false);
    return {
      async run() {
        try {
          const sessionConfig = config.search.sessions;
          const [coreStart] = await core.getStartServices();
          if (!sessionConfig.enabled) {
            logger.debug(`Search sessions are disabled. Skipping task ${title}.`);
            return;
          }
          if (aborted$.getValue()) return;

          const internalRepo = coreStart.savedObjects.createInternalRepository([
            SEARCH_SESSION_TYPE,
          ]);
          const internalSavedObjectsClient = new SavedObjectsClient(internalRepo);
          await checkFn(
            {
              logger,
              client: coreStart.elasticsearch.client.asInternalUser,
              savedObjectsClient: internalSavedObjectsClient,
            },
            sessionConfig
          )
            .pipe(takeUntil(aborted$.pipe(filter((aborted) => aborted))))
            .toPromise();

          return {
            state: {},
          };
        } catch (e) {
          logger.error(`An error occurred. Skipping task ${title}.`);
        }
      },
      cancel: async () => {
        aborted$.next(true);
      },
    };
  };
}

export function registerSearchSessionsTask(
  core: CoreSetup<DataEnhancedStartDependencies>,
  deps: SearchSessionTaskSetupDeps,
  taskType: string,
  title: string,
  checkFn: SearchSessionTaskFn
) {
  deps.taskManager.registerTaskDefinitions({
    [taskType]: {
      title,
      createTaskRunner: searchSessionTaskRunner(core, deps, title, checkFn),
      timeout: `${deps.config.search.sessions.monitoringTaskTimeout.asSeconds()}s`,
    },
  });
}

export async function unscheduleSearchSessionsTask(
  { taskManager, logger }: SearchSessionTaskStartDeps,
  taskId: string
) {
  try {
    await taskManager.removeIfExists(taskId);
    logger.debug(`${taskId} cleared`);
  } catch (e) {
    logger.error(`${taskId} Error clearing task ${e.message}`);
  }
}

export async function scheduleSearchSessionsTask(
  { taskManager, logger }: SearchSessionTaskStartDeps,
  taskId: string,
  taskType: string,
  interval: Duration
) {
  await taskManager.removeIfExists(taskId);

  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType,
      schedule: {
        interval: `${interval.asSeconds()}s`,
      },
      state: {},
      params: {},
    });

    logger.debug(`${taskId} scheduled to run`);
  } catch (e) {
    logger.error(`${taskId} Error scheduling task ${e.message}`);
  }
}
