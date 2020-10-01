/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { interval, Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { get } from 'lodash';
import { ServiceStatusLevels } from 'src/core/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { HEALTH_TASK_ID } from './task';

async function getLatestTaskState(taskManager: TaskManagerStartContract) {
  try {
    const result = await taskManager.get(HEALTH_TASK_ID);
    return result;
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    /*
      The usage service WILL to try to fetch from this collector before the task manager has been initialized, because the
      task manager has to wait for all plugins to initialize first. It's fine to ignore it as next time around it will be
      initialized (or it will throw a different type of error)
    */
    if (!errMessage.includes('NotInitialized')) {
      throw err;
    }
  }

  return null;
}

export const healthStatus$ = (taskManager: TaskManagerStartContract): Observable<unknown> => {
  return interval(1000).pipe(
    switchMap(async () => {
      const doc = await getLatestTaskState(taskManager);
      const body = get(doc, 'state');
      if (body?.isHealthy) {
        return of({
          level: ServiceStatusLevels.available,
          summary: 'Alerting framework is healthy',
        } as unknown);
      } else {
        return of({
          level: ServiceStatusLevels.unavailable,
          summary: 'Alerting framework is unhealthy',
        } as unknown);
      }
    }),
    catchError((error) =>
      of({
        level: ServiceStatusLevels.unavailable,
        summary: `Alerting framework is unhealthy`,
        meta: { error },
      } as unknown)
    )
  );
};
