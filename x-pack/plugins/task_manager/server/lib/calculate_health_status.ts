/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
import { JsonValue } from '@kbn/utility-types';
import { Logger } from '@kbn/core/server';
import { HealthStatus, RawMonitoringStats } from '../monitoring';
import { TaskManagerConfig } from '../config';

export function calculateHealthStatus(
  summarizedStats: RawMonitoringStats,
  config: TaskManagerConfig,
  logger: Logger
): HealthStatus {
  const now = Date.now();

  // if "hot" health stats are any more stale than monitored_stats_required_freshness
  // times a multiplier, consider the system unhealthy
  const requiredHotStatsFreshness: number = config.monitored_stats_required_freshness * 3;

  // if "cold" health stats are any more stale than the configured refresh
  // times a multiplier, consider the system unhealthy
  const requiredColdStatsFreshness: number = config.monitored_aggregated_stats_refresh_rate * 1.5;

  if (hasStatus(summarizedStats.stats, HealthStatus.Error)) {
    return HealthStatus.Error;
  }

  if (hasExpiredHotTimestamps(summarizedStats, now, requiredHotStatsFreshness)) {
    logger.debug('setting HealthStatus.Error because of expired hot timestamps');
    return HealthStatus.Error;
  }

  if (hasExpiredColdTimestamps(summarizedStats, now, requiredColdStatsFreshness)) {
    logger.debug('setting HealthStatus.Error because of expired cold timestamps');
    return HealthStatus.Error;
  }

  if (hasStatus(summarizedStats.stats, HealthStatus.Warning)) {
    return HealthStatus.Warning;
  }

  return HealthStatus.OK;
}

function hasStatus(stats: RawMonitoringStats['stats'], status: HealthStatus): boolean {
  return Object.values(stats)
    .map((stat) => stat?.status === status)
    .includes(true);
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
  const diff =
    now -
    getOldestTimestamp(
      monitoringStats.last_update,
      monitoringStats.stats.runtime?.value.polling.last_successful_poll
    );
  return diff > requiredFreshness;
}

function hasExpiredColdTimestamps(
  monitoringStats: RawMonitoringStats,
  now: number,
  requiredFreshness: number
): boolean {
  return now - getOldestTimestamp(monitoringStats.stats.workload?.timestamp) > requiredFreshness;
}

function getOldestTimestamp(...timestamps: Array<JsonValue | undefined>): number {
  const validTimestamps = timestamps
    .map((timestamp) => (isString(timestamp) ? Date.parse(timestamp) : NaN))
    .filter((timestamp) => !isNaN(timestamp));
  return validTimestamps.length ? Math.min(...validTimestamps) : 0;
}
