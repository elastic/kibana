/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { Logger } from 'src/core/server';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { throttleTime } from 'rxjs/operators';
import { isString } from 'lodash';
import { MonitoringStats, summarizeMonitoringStats } from '../monitoring';

enum HealthStatus {
  OK = 'OK',
  Warning = 'warn',
  Error = 'error',
}

export function healthRoute(
  router: IRouter,
  monitoringStats: Promise<Observable<MonitoringStats>>,
  logger: Logger,
  requiredHotStatsFreshness: number,
  requiredColdStatsFreshness: number
) {
  function calculateStatus(stats: MonitoringStats) {
    const now = Date.now();
    const timestamp = new Date(now).toISOString();

    /**
     * If the monitored stats aren't fresh, return a red status
     */
    const healthStatus =
      hasExpiredHotTimestamps(stats, now, requiredHotStatsFreshness) ||
      hasExpiredColdTimestamps(stats, now, requiredColdStatsFreshness)
        ? HealthStatus.Error
        : HealthStatus.OK;

    return { timestamp, status: healthStatus, ...summarizeMonitoringStats(stats) };
  }

  /* Log Task Manager stats as a Debug log line at a fixed interval */
  monitoringStats.then((monitoringStats$) => {
    monitoringStats$.pipe(throttleTime(requiredHotStatsFreshness)).subscribe((stats) => {
      logger.debug(JSON.stringify(calculateStatus(stats)));
    });
  });

  router.get(
    {
      path: '/api/task_manager/_health',
      validate: false,
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<unknown, unknown, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      return res.ok({
        body: calculateStatus(await getLatestStats(await monitoringStats)),
      });
    }
  );
}

/**
 * If certain "hot" stats are not fresh, then the _health api will should return a Red status
 * @param stats The monitored stats
 * @param now The time to compare against
 * @param requiredFreshness How fresh should these stats be
 */
function hasExpiredHotTimestamps(
  stats: MonitoringStats,
  now: number,
  requiredFreshness: number
): boolean {
  return (
    now -
      getOldestTimestamp(stats.lastUpdate, stats.stats.runtime?.value.polling.lastSuccessfulPoll) >
    requiredFreshness
  );
}

function hasExpiredColdTimestamps(
  stats: MonitoringStats,
  now: number,
  requiredFreshness: number
): boolean {
  return now - getOldestTimestamp(stats.stats.workload?.timestamp) > requiredFreshness;
}

function getOldestTimestamp(...timestamps: unknown[]): number {
  const validTimestamps = timestamps
    .map((timestamp) => (isString(timestamp) ? Date.parse(timestamp) : NaN))
    .filter((timestamp) => !isNaN(timestamp));
  return validTimestamps.length ? Math.min(...validTimestamps) : 0;
}

async function getLatestStats(monitoringStats$: Observable<MonitoringStats>) {
  return new Promise<MonitoringStats>((resolve) =>
    monitoringStats$.pipe(take(1)).subscribe((stats) => resolve(stats))
  );
}
