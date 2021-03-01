/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { defer, of, interval, Observable } from 'rxjs';
import { catchError, retry, switchMap } from 'rxjs/operators';
import { ServiceStatus, ServiceStatusLevels } from '../../../../../src/core/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { HEALTH_TASK_ID } from './task';
import { HealthStatus } from '../types';

const HEALTH_STATUS_INTERVAL = 15000; // 60000 * 5; // Five minutes
const MAX_RETRY_ATTEMPTS = 3;

const shouldReturnError = [false, false, true, true, true, false, false, false];
let counter = 0;
async function getLatestTaskState(taskManager: TaskManagerStartContract) {
  console.log('GET LATEST TASK STATE');
  if (counter < shouldReturnError.length && shouldReturnError[counter++]) {
    console.log('throwing error for task state');
    throw new Boom.Boom(`error! ${counter}`, {
      statusCode: 503,
    });
  }
  console.log('successful task state');
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

const getHealthServiceStatus = async (
  taskManager: TaskManagerStartContract
): Promise<ServiceStatus<unknown>> => {
  console.log('GETTING HEALTH STATUS');
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
};

const getHealthServiceStatusWithRetryAndErrorHandling = (
  taskManager: TaskManagerStartContract
): Observable<ServiceStatus<unknown>> => {
  return defer(() => getHealthServiceStatus(taskManager)).pipe(
    retry(MAX_RETRY_ATTEMPTS),
    catchError((error) => {
      console.log(`ERROR getting health status ${JSON.stringify(error)}`);
      return of({
        level: ServiceStatusLevels.unavailable,
        summary: LEVEL_SUMMARY[ServiceStatusLevels.unavailable.toString()],
        meta: { error },
      });
    })
  );
};

export const getHealthStatusStream = (
  taskManager: TaskManagerStartContract
): Observable<ServiceStatus<unknown>> =>
  interval(HEALTH_STATUS_INTERVAL).pipe(
    switchMap(() => getHealthServiceStatusWithRetryAndErrorHandling(taskManager))
  );
