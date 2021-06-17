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

export function logHealthMetrics(
  monitoredHealth: MonitoredHealth,
  logger: Logger,
  config: TaskManagerConfig
) {
  const healthWithoutCapacity: MonitoredHealth = {
    ...monitoredHealth,
    stats: {
      ...monitoredHealth.stats,
      capacity_estimation: undefined,
    },
  };
  const statusWithoutCapacity = calculateHealthStatus(healthWithoutCapacity, config);
  let logAsWarn = statusWithoutCapacity === HealthStatus.Warning;
  const logAsError =
    statusWithoutCapacity === HealthStatus.Error && !isEmpty(monitoredHealth.stats);
  const driftInSeconds = (monitoredHealth.stats.runtime?.value.drift.p99 ?? 0) / 1000;

  if (driftInSeconds >= config.monitored_stats_warn_delayed_task_start_in_seconds) {
    logger.warn(
      `Detected delay task start of ${driftInSeconds}s (which exceeds configured value of ${config.monitored_stats_warn_delayed_task_start_in_seconds}s)`
    );
    logAsWarn = true;
  }

  if (logAsError) {
    logger.error(`Latest Monitored Stats: ${JSON.stringify(monitoredHealth)}`);
  } else if (logAsWarn) {
    logger.warn(`Latest Monitored Stats: ${JSON.stringify(monitoredHealth)}`);
  } else {
    logger.debug(`Latest Monitored Stats: ${JSON.stringify(monitoredHealth)}`);
  }
}
