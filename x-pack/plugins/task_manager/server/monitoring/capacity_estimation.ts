/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { RawMonitoringStats, RawMonitoredStat, HealthStatus } from './monitoring_stats_stream';

export interface CapacityEstimationStat extends JsonObject {
  observed: {
    observed_kibana_instances: number;
    max_throughput_per_minute: number;
    max_throughput_per_minute_per_kibana: number;
    minutes_to_drain_overdue: number;
    avg_required_throughput_per_minute: number;
    avg_required_throughput_per_minute_per_kibana: number;
    avg_recurring_required_throughput_per_minute: number;
    avg_recurring_required_throughput_per_minute_per_kibana: number;
  };
  proposed: {
    min_required_kibana: number;
    avg_recurring_required_throughput_per_minute_per_kibana: number;
    avg_required_throughput_per_minute_per_kibana: number;
  };
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

  /**
   * Give nth ecurrent configuration how much task capacity do we have?
   */
  const capacityPerMinutePerKibana = Math.round(((60 * 1000) / pollInterval) * maxWorkers);

  /**
   * If our assumption about the number of Kibana is correct - how much capacity do we have available?
   */
  const assumedCapacityAvailablePerMinute = capacityPerMinutePerKibana * assumedKibanaInstances;

  /**
   * assuming this Kibana is representative what capacity has historically been used for the
   * different types at busy times (load at p90)
   */
  const averageCapacityUsedByPersistedTasksPerKibana = percentageOf(
    capacityPerMinutePerKibana,
    percentageOf(
      averageLoadPercentage,
      percentageOfExecutionsUsedByRecurringTasks + percentageOfExecutionsUsedByNonRecurringTasks
    )
  );

  /**
   * On average, how much of this kibana's capacity has been historically used to execute
   * non-recurring and ephemeral tasks
   */
  const averageCapacityUsedByNonRecurringAndEphemeralTasksPerKibana = percentageOf(
    capacityPerMinutePerKibana,
    percentageOf(averageLoadPercentage, 100 - percentageOfExecutionsUsedByRecurringTasks)
  );

  /**
   * On average, how much of this kibana's capacity has been historically available
   * for recurring tasks
   */
  const averageCapacityAvailableForRecurringTasksPerKibana =
    capacityPerMinutePerKibana - averageCapacityUsedByNonRecurringAndEphemeralTasksPerKibana;

  /**
   * On average, how many tasks per minute does this cluster need to execute?
   */
  const averageRecurringRequiredPerMinute =
    capacityRequirments.per_minute +
    capacityRequirments.per_hour / 60 +
    capacityRequirments.per_day / 24 / 60;

  /**
   * assuming each kibana only has as much capacity for recurring tasks as this kibana has has
   * available historically- how many kibana are needed to handle the current recurring workload?
   */
  const minRequiredKibanaInstances = Math.ceil(
    averageRecurringRequiredPerMinute / averageCapacityAvailableForRecurringTasksPerKibana
  );

  /**
   * Assuming the `minRequiredKibanaInstances` Kibana instances are provisioned - how much
   * of their throughput would we expect to be used by the recurring task workload
   */
  const averageRecurringRequiredPerMinutePerKibana =
    averageRecurringRequiredPerMinute / minRequiredKibanaInstances;

  /**
   * assuming the historical capacity needed for ephemeral and non-recurring tasks, plus
   * the amount we know each kibana would need for recurring tasks, how much capacity would
   * each kibana need if following the minRequiredKibanaInstances?
   */
  const averageRequiredThroughputPerMinutePerKibana =
    averageCapacityUsedByNonRecurringAndEphemeralTasksPerKibana *
      (assumedKibanaInstances / minRequiredKibanaInstances) +
    averageRecurringRequiredPerMinute / minRequiredKibanaInstances;

  const assumedAverageRecurringRequiredThroughputPerMinutePerKibana =
    averageRecurringRequiredPerMinute / assumedKibanaInstances;
  /**
   * assuming the historical capacity needed for ephemeral and non-recurring tasks, plus
   * the amount we know each kibana would need for recurring tasks, how much capacity would
   * each kibana need if the assumed current number were correct?
   */
  const assumedRequiredThroughputPerMinutePerKibana =
    averageCapacityUsedByNonRecurringAndEphemeralTasksPerKibana +
    averageRecurringRequiredPerMinute / assumedKibanaInstances;

  return {
    status:
      assumedRequiredThroughputPerMinutePerKibana < capacityPerMinutePerKibana
        ? HealthStatus.OK
        : assumedAverageRecurringRequiredThroughputPerMinutePerKibana < capacityPerMinutePerKibana
        ? HealthStatus.Warning
        : HealthStatus.Error,
    timestamp: new Date().toISOString(),
    value: {
      observed: mapValues(
        {
          observed_kibana_instances: assumedKibanaInstances,
          max_throughput_per_minute_per_kibana: capacityPerMinutePerKibana,
          max_throughput_per_minute: assumedCapacityAvailablePerMinute,
          minutes_to_drain_overdue:
            overdue / (assumedKibanaInstances * averageCapacityUsedByPersistedTasksPerKibana),
          avg_recurring_required_throughput_per_minute: averageRecurringRequiredPerMinute,
          avg_recurring_required_throughput_per_minute_per_kibana: assumedAverageRecurringRequiredThroughputPerMinutePerKibana,
          avg_required_throughput_per_minute:
            assumedRequiredThroughputPerMinutePerKibana * assumedKibanaInstances,
          avg_required_throughput_per_minute_per_kibana: assumedRequiredThroughputPerMinutePerKibana,
        },
        Math.ceil
      ),
      proposed: mapValues(
        {
          min_required_kibana: minRequiredKibanaInstances,
          avg_recurring_required_throughput_per_minute_per_kibana: averageRecurringRequiredPerMinutePerKibana,
          avg_required_throughput_per_minute_per_kibana: averageRequiredThroughputPerMinutePerKibana,
        },
        Math.ceil
      ),
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
