/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { Observable } from 'rxjs';
import { Logger, DocLinksServiceSetup } from '@kbn/core/server';
import { HealthStatus } from '../monitoring';
import { TaskManagerConfig } from '../config';
import { MonitoredHealth } from '../routes/health';
import { calculateHealthStatus } from './calculate_health_status';

enum LogLevel {
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
  Debug = 'debug',
}

let lastLogLevel: LogLevel | null = null;
export function resetLastLogLevel() {
  lastLogLevel = null;
}

export function setupIntervalLogging(
  monitoredHealth$: Observable<MonitoredHealth>,
  logger: Logger,
  minutes: number
) {
  let monitoredHealth: MonitoredHealth | undefined;
  monitoredHealth$.subscribe((m) => {
    monitoredHealth = m;
  });

  setInterval(onInterval, 1000 * 60 * minutes);

  function onInterval() {
    const meta = { tags: ['task-manager-background-node-health'] };
    if (!monitoredHealth) {
      return logger.warn('unable to log health metrics, not initialized yet', meta);
    }

    logger.info(`background node health: ${JSON.stringify(monitoredHealth)}`, meta);
  }
}

export function logHealthMetrics(
  monitoredHealth: MonitoredHealth,
  logger: Logger,
  config: TaskManagerConfig,
  shouldRunTasks: boolean,
  docLinks: DocLinksServiceSetup
) {
  let logLevel: LogLevel =
    config.monitored_stats_health_verbose_log.level === 'info' ? LogLevel.Info : LogLevel.Debug;
  const enabled = config.monitored_stats_health_verbose_log.enabled;
  const healthWithoutCapacity: MonitoredHealth = {
    ...monitoredHealth,
    stats: {
      ...monitoredHealth.stats,
      capacity_estimation: undefined,
    },
  };
  const healthStatus = calculateHealthStatus(healthWithoutCapacity, config, shouldRunTasks, logger);

  const statusWithoutCapacity = healthStatus?.status;
  if (statusWithoutCapacity === HealthStatus.Warning) {
    logLevel = LogLevel.Warn;
  } else if (statusWithoutCapacity === HealthStatus.Error && !isEmpty(monitoredHealth.stats)) {
    logLevel = LogLevel.Error;
  }

  const message = `Latest Monitored Stats: ${JSON.stringify(monitoredHealth)}`;
  const docLink = docLinks.links.taskManager.healthMonitoring;
  const detectedProblemMessage = `Task Manager detected a degradation in performance. This is usually temporary, and Kibana can recover automatically. If the problem persists, check the docs for troubleshooting information: ${docLink} .`;

  // Drift looks at runtime stats which are not available when task manager is not running tasks
  if (enabled && shouldRunTasks) {
    const driftInSeconds = (monitoredHealth.stats.runtime?.value.drift.p99 ?? 0) / 1000;
    if (
      driftInSeconds >= config.monitored_stats_health_verbose_log.warn_delayed_task_start_in_seconds
    ) {
      const taskTypes = Object.keys(monitoredHealth.stats.runtime?.value.drift_by_type ?? {})
        .reduce((accum: string[], typeName) => {
          if (
            monitoredHealth.stats.runtime?.value.drift_by_type[typeName].p99 ===
            monitoredHealth.stats.runtime?.value.drift.p99
          ) {
            accum.push(typeName);
          }
          return accum;
        }, [])
        .join(', ');

      logger.warn(
        `Detected delay task start of ${driftInSeconds}s for task(s) "${taskTypes}" (which exceeds configured value of ${config.monitored_stats_health_verbose_log.warn_delayed_task_start_in_seconds}s)`
      );
      logLevel = LogLevel.Warn;
    }
    switch (logLevel) {
      case LogLevel.Info:
        logger.info(message);
        break;
      case LogLevel.Warn:
        logger.warn(message);
        break;
      case LogLevel.Error:
        logger.error(message);
        break;
      default:
        logger.debug(message);
    }
  } else {
    // This is legacy support - we used to always show this
    logger.debug(message);
    if (logLevel !== LogLevel.Debug && lastLogLevel === LogLevel.Debug) {
      logger.debug(detectedProblemMessage);
    }
  }

  lastLogLevel = logLevel;
}
