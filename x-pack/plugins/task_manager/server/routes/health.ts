/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { Logger, ServiceStatus, ServiceStatusLevels } from '../../../../../src/core/server';
import {
  MonitoringStats,
  summarizeMonitoringStats,
  HealthStatus,
  RawMonitoringStats,
} from '../monitoring';
import { TaskManagerConfig } from '../config';
import { logHealthMetrics } from '../lib/log_health_metrics';
import { calculateHealthStatus } from '../lib/calculate_health_status';

export type MonitoredHealth = RawMonitoringStats & {
  id: string;
  status: HealthStatus;
  timestamp: string;
};

const LEVEL_SUMMARY = {
  [ServiceStatusLevels.available.toString()]: 'Task Manager is healthy',
  [ServiceStatusLevels.degraded.toString()]: 'Task Manager is unhealthy',
  [ServiceStatusLevels.unavailable.toString()]: 'Task Manager is unavailable',
};

/**
 * We enforce a `meta` of `never` because this meta gets duplicated into *every dependant plugin*, and
 * this will then get logged out when logging is set to Verbose.
 * We used to pass in the the entire MonitoredHealth into this `meta` field, but this means that the
 * whole MonitoredHealth JSON (which can be quite big) was duplicated dozens of times and when we
 * try to view logs in Discover, it fails to render as this JSON was often dozens of levels deep.
 */
type TaskManagerServiceStatus = ServiceStatus<never>;

export function healthRoute(
  router: IRouter,
  monitoringStats$: Observable<MonitoringStats>,
  logger: Logger,
  taskManagerId: string,
  config: TaskManagerConfig
): {
  serviceStatus$: Observable<TaskManagerServiceStatus>;
  monitoredHealth$: Observable<MonitoredHealth>;
} {
  // if "hot" health stats are any more stale than monitored_stats_required_freshness (pollInterval +1s buffer by default)
  // consider the system unhealthy
  const requiredHotStatsFreshness: number = config.monitored_stats_required_freshness;

  function getHealthStatus(monitoredStats: MonitoringStats) {
    const summarizedStats = summarizeMonitoringStats(monitoredStats, config);
    const status = calculateHealthStatus(summarizedStats, config);
    const now = Date.now();
    const timestamp = new Date(now).toISOString();
    return { id: taskManagerId, timestamp, status, ...summarizedStats };
  }

  const serviceStatus$: Subject<TaskManagerServiceStatus> = new Subject<TaskManagerServiceStatus>();
  const monitoredHealth$: Subject<MonitoredHealth> = new Subject<MonitoredHealth>();

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
      map((stats) => withServiceStatus(getHealthStatus(stats)))
    )
    .subscribe(([monitoredHealth, serviceStatus]) => {
      serviceStatus$.next(serviceStatus);
      monitoredHealth$.next(monitoredHealth);
      logHealthMetrics(monitoredHealth, logger, config);
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
          ? getHealthStatus(lastMonitoredStats)
          : { id: taskManagerId, timestamp: new Date().toISOString(), status: HealthStatus.Error },
      });
    }
  );
  return { serviceStatus$, monitoredHealth$ };
}

export function withServiceStatus(
  monitoredHealth: MonitoredHealth
): [MonitoredHealth, TaskManagerServiceStatus] {
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
    },
  ];
}
