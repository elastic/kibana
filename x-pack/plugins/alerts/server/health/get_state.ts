/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { interval, Observable, Subject, throwError } from 'rxjs';
import { catchError, finalize, mergeMap, retryWhen, switchMap } from 'rxjs/operators';
import { ServiceStatus, ServiceStatusLevels } from '../../../../../src/core/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { HEALTH_TASK_ID } from './task';
import { HealthStatus } from '../types';

export const healthState$: Subject<ServiceStatus> = new Subject<ServiceStatus>();

async function getLatestTaskState(taskManager: TaskManagerStartContract) {
  // throw new Error('oh no');
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

const MAX_RETRY_ATTEMPTS = 5;
const LEVEL_SUMMARY = {
  [ServiceStatusLevels.available.toString()]: i18n.translate(
    'xpack.alerts.server.healthStatus.available',
    {
      defaultMessage: 'Alerting framework is available',
    }
  ),
  [ServiceStatusLevels.degraded.toString()]: i18n.translate(
    'xpack.alerts.server.healthStatus.degraded',
    {
      defaultMessage: 'Alerting framework is degraded',
    }
  ),
  [ServiceStatusLevels.unavailable.toString()]: i18n.translate(
    'xpack.alerts.server.healthStatus.unavailable',
    {
      defaultMessage: 'Alerting framework is unavailable',
    }
  ),
};

export const getHealthStatusStream = (
  taskManager: TaskManagerStartContract
): Observable<ServiceStatus<unknown>> => {
  return interval(30000).pipe(
    switchMap(async () => {
      // console.log('getting health status');
      const doc = await getLatestTaskState(taskManager);
      const level =
        doc?.state?.health_status === HealthStatus.OK
          ? ServiceStatusLevels.available
          : doc?.state?.health_status === HealthStatus.Warning
          ? ServiceStatusLevels.degraded
          : ServiceStatusLevels.unavailable;
      return {
        level,
        summary: LEVEL_SUMMARY[level.toString()],
      };
    }),
    // retryWhen((errors) => {
    //   return errors.pipe(
    //     mergeMap((error, i) => {
    //       const retryAttempt = i + 1;
    //       // if maximum number of retries have been met, throw error
    //       if (retryAttempt > MAX_RETRY_ATTEMPTS) {
    //         return throwError(error);
    //       }
    //       console.log(`Attempt ${retryAttempt}: retrying in 1000ms`);
    //       return timer(1000);
    //     }),
    //     finalize(() => console.log('We are done!'))
    //   );
    // }),
    catchError(async (error) => {
      console.log('ERROR getting health status');
      return {
        level: ServiceStatusLevels.unavailable,
        summary: LEVEL_SUMMARY[ServiceStatusLevels.unavailable.toString()],
        meta: { error },
      };
    })
  );
};
