/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from 'src/plugins/kibana_utils/common';
import { RawMonitoringStats, RawMonitoredStat, HealthStatus } from './monitoring_stats_stream';

export interface CapacityEstimationStat extends JsonObject {
  minutes_to_drain_overdue: number;
  max_throughput_per_minute: number;
  min_required_kibana: number;
  avg_required_throughput_per_minute: number;
  avg_recurring_required_throughput_per_minute: number;
}

export type CapacityEstimationParams = Omit<
  Required<RawMonitoringStats['stats']>,
  'capacity_estimation'
>;

function isCapacityEstimationParams(
  stats: RawMonitoringStats['stats']
): stats is CapacityEstimationParams {
  return !!(stats.configuration && stats.runtime && stats.workload);
}

export function estimateCapacity(
  stats: CapacityEstimationParams
): RawMonitoredStat<CapacityEstimationStat> {
  // stats.runtime.value.execution.persistence.
  const uniqueOwnerIdsAtThisMoment = stats.workload.value.owner_ids;
  const { recurring: recurringTasksAsPercentage } = stats.runtime.value.execution.persistence;
  const { overdue, capacity_requirments: capacityRequirments } = stats.workload.value;
  const { poll_interval: pollInterval, max_workers: maxWorkers } = stats.configuration.value;
  const capacityPerMinute = Math.round(((60 * 1000) / pollInterval) * maxWorkers);
  const averageCapacityAvailableForRecurringTasks =
    capacityPerMinute * (recurringTasksAsPercentage / 100);

  const averageRequiredPerMinute =
    capacityRequirments.per_minute +
    Math.ceil(capacityRequirments.per_hour / 60) +
    Math.ceil(capacityRequirments.per_day / 24 / 60);

  const practicalRequiredPerMinute =
    averageRequiredPerMinute + (capacityPerMinute - averageCapacityAvailableForRecurringTasks);

  return {
    status:
      practicalRequiredPerMinute < capacityPerMinute
        ? HealthStatus.OK
        : averageRequiredPerMinute < capacityPerMinute
        ? HealthStatus.Warning
        : HealthStatus.Error,
    timestamp: new Date().toISOString(),
    value: {
      minutes_to_drain_overdue: Math.ceil(overdue / practicalRequiredPerMinute),
      min_required_kibana: Math.ceil(practicalRequiredPerMinute / capacityPerMinute),
      max_throughput_per_minute: uniqueOwnerIdsAtThisMoment * capacityPerMinute,
      avg_recurring_required_throughput_per_minute: averageRequiredPerMinute,
      avg_required_throughput_per_minute: practicalRequiredPerMinute,
    },
  };
}

export function withCapacityEstimate(
  stats: RawMonitoringStats['stats']
): RawMonitoringStats['stats'] {
  if (isCapacityEstimationParams(stats)) {
    return {
      ...stats,
      capacity_estimation: estimateCapacity(stats),
    };
  }
  return stats;
}
