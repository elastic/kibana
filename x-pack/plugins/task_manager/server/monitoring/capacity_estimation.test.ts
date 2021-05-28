/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CapacityEstimationParams, estimateCapacity } from './capacity_estimation';
import { HealthStatus, RawMonitoringStats } from './monitoring_stats_stream';

describe('estimateCapacity', () => {
  test('estimates the max capacity available to handle the tasks in the workload that repeat within a minute', async () => {
    expect(
      estimateCapacity(
        mockStats(
          { max_workers: 10, poll_interval: 3000 },
          {
            owner_ids: 1,
            overdue_non_recurring: 0,
            capacity_requirments: {
              per_minute: 60,
              per_hour: 0,
              per_day: 0,
            },
          },
          {
            execution: {
              duration: {},
              // no non-recurring executions in the system in recent history
              persistence: {
                ephemeral: 0,
                non_recurring: 0,
                recurring: 100,
              },
              result_frequency_percent_as_number: {},
            },
          }
        )
      ).value
    ).toMatchObject({
      assumed_kibana_instances: 1,
      min_required_kibana: 1,
      minutes_to_drain_overdue: 0,
      max_throughput_per_minute: 200,
    });
  });

  test('estimates the min required capacity to handle the tasks in the workload that repeat within a hour or day', async () => {
    expect(
      estimateCapacity(
        mockStats(
          { max_workers: 10, poll_interval: 3000 },
          {
            owner_ids: 1,
            overdue_non_recurring: 0,
            capacity_requirments: {
              per_minute: 0,
              per_hour: 12000,
              per_day: 200,
            },
          },
          {
            execution: {
              duration: {},
              // no non-recurring executions in the system in recent history
              persistence: {
                ephemeral: 0,
                non_recurring: 0,
                recurring: 100,
              },
              result_frequency_percent_as_number: {},
            },
          }
        )
      ).value
    ).toMatchObject({
      assumed_kibana_instances: 1,
      min_required_kibana: 2,
      minutes_to_drain_overdue: 0,
      max_throughput_per_minute: 200,
    });
  });

  test('estimates the max capacity available when there are no active Kibana', async () => {
    expect(
      estimateCapacity(
        mockStats(
          { max_workers: 10, poll_interval: 3000 },
          {
            // 0 active tasks at this moment in time, so no owners identifiable
            owner_ids: 0,
            overdue_non_recurring: 0,
            capacity_requirments: {
              per_minute: 60,
              per_hour: 0,
              per_day: 0,
            },
          },
          {
            execution: {
              duration: {},
              // no non-recurring executions in the system in recent history
              persistence: {
                ephemeral: 0,
                non_recurring: 0,
                recurring: 100,
              },
              result_frequency_percent_as_number: {},
            },
          }
        )
      ).value
    ).toMatchObject({
      assumed_kibana_instances: 1,
      min_required_kibana: 1,
      minutes_to_drain_overdue: 0,
      max_throughput_per_minute: 200,
      avg_required_throughput_per_minute: 60,
      avg_recurring_required_throughput_per_minute: 60,
    });
  });

  test('estimates the max capacity available to handle the workload when there are multiple kibana', async () => {
    expect(
      estimateCapacity(
        mockStats(
          { max_workers: 10, poll_interval: 3000 },
          {
            owner_ids: 3,
            overdue_non_recurring: 0,
            capacity_requirments: {
              per_minute: 150,
              per_hour: 60,
              per_day: 0,
            },
          },
          {
            execution: {
              duration: {},
              // no non-recurring executions in the system in recent history
              persistence: {
                ephemeral: 0,
                non_recurring: 0,
                recurring: 100,
              },
              result_frequency_percent_as_number: {},
            },
          }
        )
      ).value
    ).toMatchObject({
      assumed_kibana_instances: 3,
      min_required_kibana: 1,
      minutes_to_drain_overdue: 0,
      max_throughput_per_minute: 3 * 200, // 3 kibana, 200tpm each
      avg_required_throughput_per_minute: 150 + 1, // 150 every minute, plus 60 every hour
    });
  });

  test('marks estimated capacity as Warning state when capacity is insufficient for recent spikes of non-recurring workload, but sufficient for the recurring workload', async () => {
    expect(
      estimateCapacity(
        mockStats(
          { max_workers: 10, poll_interval: 3000 },
          {
            owner_ids: 1,
            overdue_non_recurring: 0,
            capacity_requirments: {
              per_minute: 175,
              per_hour: 0,
              per_day: 0,
            },
          },
          {
            load: {
              p50: 40,
              p90: 100,
              p95: 100,
              p99: 100,
            },
            execution: {
              duration: {},
              // no non-recurring executions in the system in recent history
              persistence: {
                ephemeral: 0,
                non_recurring: 20,
                recurring: 80,
              },
              result_frequency_percent_as_number: {},
            },
          }
        )
      )
    ).toMatchObject({
      status: 'warn',
      timestamp: expect.any(String),
      value: {
        assumed_kibana_instances: 1,
        min_required_kibana: 2,
        minutes_to_drain_overdue: 0,
        max_throughput_per_minute: 200,
        avg_required_throughput_per_minute: 215,
        avg_recurring_required_throughput_per_minute: 175,
      },
    });
  });

  test('marks estimated capacity as OK state when workload and load suggest capacity is sufficient', async () => {
    expect(
      estimateCapacity(
        mockStats(
          { max_workers: 10, poll_interval: 3000 },
          {
            owner_ids: 1,
            overdue_non_recurring: 0,
            capacity_requirments: {
              per_minute: 170,
              per_hour: 0,
              per_day: 0,
            },
          },
          {
            load: {
              p50: 40,
              // as avg p90 load is only 50%, it seems we have sufficient
              // capacity, but if we saw a higher load (say 80% here), it would fail
              // as status would be Warn (as seen in a previous test)
              p90: 50,
              p95: 80,
              p99: 80,
            },
            execution: {
              duration: {},
              // 20% average of non-recurring executions in the system in recent history
              persistence: {
                ephemeral: 0,
                non_recurring: 20,
                recurring: 80,
              },
              result_frequency_percent_as_number: {},
            },
          }
        )
      )
    ).toMatchObject({
      status: 'OK',
      timestamp: expect.any(String),
      value: {
        min_required_kibana: 1,
        minutes_to_drain_overdue: 0,
        max_throughput_per_minute: 200,
        avg_required_throughput_per_minute: 190,
        avg_recurring_required_throughput_per_minute: 170,
      },
    });
  });

  test('marks estimated capacity as Error state when workload and load suggest capacity is insufficient', async () => {
    expect(
      estimateCapacity(
        mockStats(
          { max_workers: 10, poll_interval: 3000 },
          {
            owner_ids: 1,
            overdue_non_recurring: 0,
            capacity_requirments: {
              per_minute: 210,
              per_hour: 0,
              per_day: 0,
            },
          },
          {
            load: {
              p50: 80,
              p90: 100,
              p95: 100,
              p99: 100,
            },
            execution: {
              duration: {},
              // 20% average of non-recurring executions in the system in recent history
              persistence: {
                ephemeral: 0,
                non_recurring: 20,
                recurring: 80,
              },
              result_frequency_percent_as_number: {},
            },
          }
        )
      )
    ).toMatchObject({
      status: 'error',
      timestamp: expect.any(String),
      value: {
        min_required_kibana: 2,
        minutes_to_drain_overdue: 0,
        max_throughput_per_minute: 200,
        avg_required_throughput_per_minute: 250,
        avg_recurring_required_throughput_per_minute: 210,
      },
    });
  });
});

function mockStats(
  configuration: Partial<Required<RawMonitoringStats['stats']>['configuration']['value']> = {},
  workload: Partial<Required<RawMonitoringStats['stats']>['workload']['value']> = {},
  runtime: Partial<Required<RawMonitoringStats['stats']>['runtime']['value']> = {}
): CapacityEstimationParams {
  return {
    configuration: {
      status: HealthStatus.OK,
      timestamp: new Date().toISOString(),
      value: {
        max_workers: 0,
        poll_interval: 0,
        max_poll_inactivity_cycles: 10,
        request_capacity: 1000,
        monitored_aggregated_stats_refresh_rate: 5000,
        monitored_stats_running_average_window: 50,
        monitored_task_execution_thresholds: {
          default: {
            error_threshold: 90,
            warn_threshold: 80,
          },
          custom: {},
        },
        ...configuration,
      },
    },
    workload: {
      status: HealthStatus.OK,
      timestamp: new Date().toISOString(),
      value: {
        count: 4,
        task_types: {
          actions_telemetry: { count: 2, status: { idle: 2 } },
          alerting_telemetry: { count: 1, status: { idle: 1 } },
          session_cleanup: { count: 1, status: { idle: 1 } },
        },
        schedule: [],
        overdue: 0,
        overdue_non_recurring: 0,
        estimated_schedule_density: [],
        non_recurring: 20,
        owner_ids: 2,
        capacity_requirments: {
          per_minute: 150,
          per_hour: 360,
          per_day: 820,
        },
        ...workload,
      },
    },
    runtime: {
      status: HealthStatus.OK,
      timestamp: new Date().toISOString(),
      value: {
        drift: {
          p50: 4,
          p90: 6,
          p95: 6,
          p99: 6,
        },
        drift_by_type: {},
        load: {
          p50: 40,
          p90: 60,
          p95: 60,
          p99: 60,
        },
        execution: {
          duration: {},
          persistence: {
            ephemeral: 0,
            non_recurring: 30,
            recurring: 70,
          },
          result_frequency_percent_as_number: {},
        },
        polling: {
          last_successful_poll: new Date().toISOString(),
          duration: [],
          claim_conflicts: [],
          claim_mismatches: [],
          result_frequency_percent_as_number: [],
        },
        ...runtime,
      },
    },
  };
}
