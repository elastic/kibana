/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { Logger } from '../../../../../src/core/server';
import { HealthStatus } from '../monitoring';
import { TaskManagerConfig } from '../config';
import { MonitoredHealth } from '../routes/health';
import { calculateHealthStatus } from './calculate_health_status';

enum LogLevel {
  Warn = 'warn',
  Error = 'error',
  Debug = 'debug',
}

let lastLogLevel: LogLevel | null = null;
export function resetLastLogLevel() {
  lastLogLevel = null;
}
export function logHealthMetrics(
  monitoredHealth: MonitoredHealth,
  logger: Logger,
  config: TaskManagerConfig
) {
  return;
  let logLevel: LogLevel = LogLevel.Debug;
  const enabled = config.monitored_stats_health_verbose_log.enabled;
  const healthWithoutCapacity: MonitoredHealth = {
    ...monitoredHealth,
    stats: {
      ...monitoredHealth.stats,
      capacity_estimation: undefined,
    },
  };
  const statusWithoutCapacity = calculateHealthStatus(healthWithoutCapacity, config);
  if (statusWithoutCapacity === HealthStatus.Warning) {
    logLevel = LogLevel.Warn;
  } else if (statusWithoutCapacity === HealthStatus.Error && !isEmpty(monitoredHealth.stats)) {
    logLevel = LogLevel.Error;
  }

  const message = `Latest Monitored Stats: ${JSON.stringify(monitoredHealth)}`;
  if (enabled) {
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
      logger.warn(
        `Detected potential performance issue with Task Manager. Set 'xpack.task_manager.monitored_stats_health_verbose_log.enabled: true' in your Kibana.yml to enable debug logging`
      );
    }
  }

  lastLogLevel = logLevel;
}
