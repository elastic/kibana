/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { interval, Observable } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ServiceStatus, ServiceStatusLevels } from '../../../../../src/core/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { HEALTH_TASK_ID } from './task';
import { HealthStatus } from '../types';

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
  return interval(60000 * 5).pipe(
    switchMap(async () => {
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
    catchError(async (error) => ({
      level: ServiceStatusLevels.unavailable,
      summary: LEVEL_SUMMARY[ServiceStatusLevels.unavailable.toString()],
      meta: { error },
    }))
  );
};
