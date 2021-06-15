/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '../../../../../src/core/server';
import { HealthStatus } from '../monitoring';
import { TaskManagerConfig } from '../config';
import { MonitoredHealth } from '../routes/health';

export function logHealthMetrics(
  monitoredHealth: MonitoredHealth,
  logger: Logger,
  config: TaskManagerConfig
) {
  let contextMessage;

  let logAsWarn = monitoredHealth.status === HealthStatus.Warning;
  const logAsError = monitoredHealth.status === HealthStatus.Error;
  const driftInSeconds = (monitoredHealth.stats.runtime?.value.drift.p99 ?? 0) / 1000;

  if (driftInSeconds >= config.monitored_stats_warn_drift_in_seconds) {
    contextMessage = `Detected drift of ${driftInSeconds}s`;
    logAsWarn = true;
  }

  if (logAsError) {
    logger.error(
      `Latest Monitored Stats (${contextMessage ?? `error status`}): ${JSON.stringify(
        monitoredHealth
      )}`
    );
  } else if (logAsWarn) {
    logger.warn(
      `Latest Monitored Stats (${contextMessage ?? `warning status`}): ${JSON.stringify(
        monitoredHealth
      )}`
    );
  } else {
    logger.debug(`Latest Monitored Stats: ${JSON.stringify(monitoredHealth)}`);
  }
}
