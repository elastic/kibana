/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { interval } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { get } from 'lodash';
import { ServiceStatusLevels } from '../../../../../src/core/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { HEALTH_TASK_ID } from './task';

async function getLatestTaskState(taskManager: TaskManagerStartContract) {
  try {
    const result = await taskManager.get(HEALTH_TASK_ID);
    return result;
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    if (!errMessage.includes('NotInitialized')) {
      throw err;
    }
  }

  return null;
}

export const healthStatus$ = (taskManager: TaskManagerStartContract) => {
  return interval(1000).pipe(
    switchMap(async () => {
      const doc = await getLatestTaskState(taskManager);
      const body = get(doc, 'state');
      if (body?.isHealthy) {
        return {
          level: ServiceStatusLevels.available,
          summary: 'Alerting framework is healthy',
        };
      } else {
        return {
          level: ServiceStatusLevels.unavailable,
          summary: 'Alerting framework is unhealthy',
        };
      }
    }),
    catchError(async (error) => ({
      level: ServiceStatusLevels.unavailable,
      summary: `Alerting framework is unhealthy`,
      meta: { error },
    }))
  );
};
