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
import { Observable, Subject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { throttleTime } from 'rxjs/operators';
import { isString } from 'lodash';
import { JsonValue } from 'src/plugins/kibana_utils/common';
import { Logger, ServiceStatus, ServiceStatusLevels } from '../../../../../src/core/server';
import {
  MonitoringStats,
  summarizeMonitoringStats,
  HealthStatus,
  RawMonitoringStats,
} from '../monitoring';
import { TaskManagerConfig } from '../config';

type MonitoredHealth = RawMonitoringStats & { id: string; status: HealthStatus; timestamp: string };

const LEVEL_SUMMARY = {
  [ServiceStatusLevels.available.toString()]: 'Task Manager is healthy',
  [ServiceStatusLevels.degraded.toString()]: 'Task Manager is unhealthy',
  [ServiceStatusLevels.unavailable.toString()]: 'Task Manager is unavailable',
};

export function healthRoute(
  router: IRouter,
  monitoringStats$: Observable<MonitoringStats>,
  logger: Logger,
  taskManagerId: string,
  config: TaskManagerConfig
): Observable<ServiceStatus> {
  // if "hot" health stats are any more stale than monitored_stats_required_freshness (pollInterval +1s buffer by default)
  // consider the system unhealthy
  const requiredHotStatsFreshness: number = config.monitored_stats_required_freshness;

  // if "cold" health stats are any more stale than the configured refresh (+ a buffer), consider the system unhealthy
  const requiredColdStatsFreshness: number = config.monitored_aggregated_stats_refresh_rate * 1.5;

  function calculateStatus(monitoredStats: MonitoringStats): MonitoredHealth {
    const now = Date.now();
    const timestamp = new Date(now).toISOString();
    const summarizedStats = summarizeMonitoringStats(monitoredStats, config);

    /**
     * If the monitored stats aren't fresh, return a red status
     */
    const healthStatus =
      hasStatus(summarizedStats.stats, HealthStatus.Error) ||
      hasExpiredHotTimestamps(summarizedStats, now, requiredHotStatsFreshness) ||
      hasExpiredColdTimestamps(summarizedStats, now, requiredColdStatsFreshness)
        ? HealthStatus.Error
        : hasStatus(summarizedStats.stats, HealthStatus.Warning)
        ? HealthStatus.Warning
        : HealthStatus.OK;
    return { id: taskManagerId, timestamp, status: healthStatus, ...summarizedStats };
  }

  const serviceStatus$: Subject<ServiceStatus> = new Subject<ServiceStatus>();

  /* keep track of last health summary, as we'll return that to the next call to _health */
  let lastMonitoredStats: MonitoringStats | null = null;

  /* Log Task Manager stats as a Debug log line at a fixed interval */
  monitoringStats$
    .pipe(
      throttleTime(requiredHotStatsFreshness),
      tap((stats) => {
        lastMonitoredStats = stats;
      }),
      // Only calculate the summerized stats (calculates all runnign averages and evaluates state)
      // when needed by throttling down to the requiredHotStatsFreshness
      map((stats) => withServiceStatus(calculateStatus(stats)))
    )
    .subscribe(([monitoredHealth, serviceStatus]) => {
      serviceStatus$.next(serviceStatus);
      logger.debug(`Latest Monitored Stats: ${JSON.stringify(monitoredHealth)}`);
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
        body: lastMonitoredStats
          ? calculateStatus(lastMonitoredStats)
          : { id: taskManagerId, timestamp: new Date().toISOString(), status: HealthStatus.Error },
      });
    }
  );
  return serviceStatus$;
}

export function withServiceStatus(
  monitoredHealth: MonitoredHealth
): [MonitoredHealth, ServiceStatus] {
  const level =
    monitoredHealth.status === HealthStatus.OK
      ? ServiceStatusLevels.available
      : monitoredHealth.status === HealthStatus.Warning
      ? ServiceStatusLevels.degraded
      : ServiceStatusLevels.unavailable;
  return [
    monitoredHealth,
    {
      level,
      summary: LEVEL_SUMMARY[level.toString()],
      meta: monitoredHealth,
    },
  ];
}

/**
 * If certain "hot" stats are not fresh, then the _health api will should return a Red status
 * @param monitoringStats The monitored stats
 * @param now The time to compare against
 * @param requiredFreshness How fresh should these stats be
 */
function hasExpiredHotTimestamps(
  monitoringStats: RawMonitoringStats,
  now: number,
  requiredFreshness: number
): boolean {
  return (
    now -
      getOldestTimestamp(
        monitoringStats.last_update,
        monitoringStats.stats.runtime?.value.polling.last_successful_poll
      ) >
    requiredFreshness
  );
}

function hasExpiredColdTimestamps(
  monitoringStats: RawMonitoringStats,
  now: number,
  requiredFreshness: number
): boolean {
  return now - getOldestTimestamp(monitoringStats.stats.workload?.timestamp) > requiredFreshness;
}

function hasStatus(stats: RawMonitoringStats['stats'], status: HealthStatus): boolean {
  return Object.values(stats)
    .map((stat) => stat?.status === status)
    .includes(true);
}

function getOldestTimestamp(...timestamps: Array<JsonValue | undefined>): number {
  const validTimestamps = timestamps
    .map((timestamp) => (isString(timestamp) ? Date.parse(timestamp) : NaN))
    .filter((timestamp) => !isNaN(timestamp));
  return validTimestamps.length ? Math.min(...validTimestamps) : 0;
}
