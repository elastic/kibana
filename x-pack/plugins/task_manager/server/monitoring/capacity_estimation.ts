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
  const workload = stats.workload.value;
  // if there are no active owners right now, assume there's at least 1
  const assumedKibanaInstances = Math.max(workload.owner_ids, 1);

  const {
    load: { p90: averageLoadPercentage },
  } = stats.runtime.value;
  const {
    recurring: percentageOfExecutionsUsedByRecurringTasks,
    non_recurring: percentageOfExecutionsUsedByNonRecurringTasks,
  } = stats.runtime.value.execution.persistence;
  const { overdue, capacity_requirments: capacityRequirments } = workload;
  const { poll_interval: pollInterval, max_workers: maxWorkers } = stats.configuration.value;

  const capacityPerMinutePerKibana = Math.round(((60 * 1000) / pollInterval) * maxWorkers);
  const capacityAvailablePerMinute = capacityPerMinutePerKibana * assumedKibanaInstances;

  // assuming this Kibana is representative what capacity has historically been used
  // for the different types at busy times (load at p90)
  const averageCapacityUsedByPersistedTasks = percentageOf(
    capacityAvailablePerMinute,
    percentageOf(
      averageLoadPercentage,
      percentageOfExecutionsUsedByRecurringTasks + percentageOfExecutionsUsedByNonRecurringTasks
    )
  );

  const averageCapacityUsedByNonRecurringTasks = percentageOf(
    capacityAvailablePerMinute,
    percentageOf(averageLoadPercentage, 100 - percentageOfExecutionsUsedByRecurringTasks)
  );

  const averageRecurringRequiredPerMinute =
    capacityRequirments.per_minute +
    Math.ceil(capacityRequirments.per_hour / 60) +
    Math.ceil(capacityRequirments.per_day / 24 / 60);

  const requiredCapacityInPracticePerMinute =
    averageCapacityUsedByNonRecurringTasks + averageRecurringRequiredPerMinute;

  return {
    status:
      requiredCapacityInPracticePerMinute < capacityAvailablePerMinute
        ? HealthStatus.OK
        : averageRecurringRequiredPerMinute < capacityAvailablePerMinute
        ? HealthStatus.Warning
        : HealthStatus.Error,
    timestamp: new Date().toISOString(),
    value: {
      assumed_kibana_instances: assumedKibanaInstances,
      minutes_to_drain_overdue: Math.ceil(overdue / averageCapacityUsedByPersistedTasks),
      min_required_kibana: Math.ceil(
        requiredCapacityInPracticePerMinute / capacityAvailablePerMinute
      ),
      max_throughput_per_minute: capacityAvailablePerMinute,
      avg_recurring_required_throughput_per_minute: averageRecurringRequiredPerMinute,
      avg_required_throughput_per_minute: requiredCapacityInPracticePerMinute,
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

function percentageOf(val: number, percentage: number) {
  return Math.round((percentage * val) / 100);
}
