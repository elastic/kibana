/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { defer, of, interval, Observable, throwError, timer } from 'rxjs';
import { catchError, mergeMap, retryWhen, startWith, switchMap } from 'rxjs/operators';
import {
  Logger,
  SavedObjectsServiceStart,
  ServiceStatus,
  ServiceStatusLevels,
} from '../../../../../src/core/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { HEALTH_TASK_ID, scheduleAlertingHealthCheck } from './task';
import { HealthStatus } from '../types';
import { getAlertingHealthStatus } from './get_health';
import { AlertsConfig } from '../config';

export const MAX_RETRY_ATTEMPTS = 3;
const HEALTH_STATUS_INTERVAL = 60000 * 5; // Five minutes
const RETRY_DELAY = 5000; // Wait 5 seconds before retrying on errors

async function getLatestTaskState(
  taskManager: TaskManagerStartContract,
  logger: Logger,
  savedObjects: SavedObjectsServiceStart,
  config: Promise<AlertsConfig>
) {
  try {
    return await taskManager.get(HEALTH_TASK_ID);
  } catch (err) {
    // if task is not found
    if (err?.output?.statusCode === 404) {
      await scheduleAlertingHealthCheck(logger, config, taskManager);
      return await getAlertingHealthStatus(savedObjects);
    }
    throw err;
  }
}

const LEVEL_SUMMARY = {
  [ServiceStatusLevels.available.toString()]: i18n.translate(
    'xpack.alerting.server.healthStatus.available',
    {
      defaultMessage: 'Alerting framework is available',
    }
  ),
  [ServiceStatusLevels.degraded.toString()]: i18n.translate(
    'xpack.alerting.server.healthStatus.degraded',
    {
      defaultMessage: 'Alerting framework is degraded',
    }
  ),
  [ServiceStatusLevels.unavailable.toString()]: i18n.translate(
    'xpack.alerting.server.healthStatus.unavailable',
    {
      defaultMessage: 'Alerting framework is unavailable',
    }
  ),
};

const getHealthServiceStatus = async (
  taskManager: TaskManagerStartContract,
  logger: Logger,
  savedObjects: SavedObjectsServiceStart,
  config: Promise<AlertsConfig>
): Promise<ServiceStatus<unknown>> => {
  const doc = await getLatestTaskState(taskManager, logger, savedObjects, config);
  const level =
    doc.state?.health_status === HealthStatus.OK
      ? ServiceStatusLevels.available
      : ServiceStatusLevels.degraded;
  return {
    level,
    summary: LEVEL_SUMMARY[level.toString()],
  };
};

export const getHealthServiceStatusWithRetryAndErrorHandling = (
  taskManager: TaskManagerStartContract,
  logger: Logger,
  savedObjects: SavedObjectsServiceStart,
  config: Promise<AlertsConfig>,
  retryDelay?: number
): Observable<ServiceStatus<unknown>> => {
  return defer(() => getHealthServiceStatus(taskManager, logger, savedObjects, config)).pipe(
    retryWhen((errors) => {
      return errors.pipe(
        mergeMap((error, i) => {
          const retryAttempt = i + 1;
          if (retryAttempt > MAX_RETRY_ATTEMPTS) {
            return throwError(error);
          }
          return timer(retryDelay ?? RETRY_DELAY);
        })
      );
    }),
    catchError((error) => {
      logger.warn(`Alerting framework is degraded due to the error: ${error}`);
      return of({
        level: ServiceStatusLevels.degraded,
        summary: LEVEL_SUMMARY[ServiceStatusLevels.degraded.toString()],
        meta: { error },
      });
    })
  );
};

export const getHealthStatusStream = (
  taskManager: TaskManagerStartContract,
  logger: Logger,
  savedObjects: SavedObjectsServiceStart,
  config: Promise<AlertsConfig>,
  healthStatusInterval?: number,
  retryDelay?: number
): Observable<ServiceStatus<unknown>> =>
  interval(healthStatusInterval ?? HEALTH_STATUS_INTERVAL).pipe(
    // Emit an initial check
    startWith(
      getHealthServiceStatusWithRetryAndErrorHandling(
        taskManager,
        logger,
        savedObjects,
        config,
        retryDelay
      )
    ),
    // On each interval do a new check
    switchMap(() =>
      getHealthServiceStatusWithRetryAndErrorHandling(
        taskManager,
        logger,
        savedObjects,
        config,
        retryDelay
      )
    )
  );
