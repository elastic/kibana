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

  if (enabled) {
    const driftInSeconds = (monitoredHealth.stats.runtime?.value.drift.p99 ?? 0) / 1000;
    if (
      driftInSeconds >= config.monitored_stats_health_verbose_log.warn_delayed_task_start_in_seconds
    ) {
      logger.warn(
        `Detected delay task start of ${driftInSeconds}s (which exceeds configured value of ${config.monitored_stats_health_verbose_log.warn_delayed_task_start_in_seconds}s)`
      );
      logLevel = LogLevel.Warn;
    }

    const message = `Latest Monitored Stats: ${JSON.stringify(monitoredHealth)}`;
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
    if (logLevel !== LogLevel.Debug && lastLogLevel === LogLevel.Debug) {
      logger.warn(
        `Detected potential performance issue with Task Manager. Set 'xpack.task_manager.monitored_stats_health_verbose_log.enabled: true' in your Kibana.yml to enable debug logging`
      );
    }
  }

  lastLogLevel = logLevel;
}
