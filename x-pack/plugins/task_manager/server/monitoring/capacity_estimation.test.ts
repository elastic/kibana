/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CapacityEstimationParams, estimateCapacity } from './capacity_estimation';
import { HealthStatus, RawMonitoringStats } from './monitoring_stats_stream';

describe('estimateCapacity', () => {
  test('estimates the max throughput per minute based on the workload and the assumed kibana instances', async () => {
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
              duration_by_persistence: {
                ephemeral: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                non_recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
              },
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
      ).value.observed
    ).toMatchObject({
      observed_kibana_instances: 1,
      minutes_to_drain_overdue: 0,
      max_throughput_per_minute: 200,
    });
  });

  test('reduces the available capacity per kibana when average task duration exceeds the poll interval', async () => {
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
              duration_by_persistence: {
                ephemeral: {
                  p50: 2400,
                  p90: 2500,
                  p95: 3200,
                  p99: 3500,
                },
                non_recurring: {
                  p50: 1400,
                  p90: 1500,
                  p95: 2200,
                  p99: 3500,
                },
                recurring: {
                  p50: 8345,
                  p90: 140651.5,
                  p95: 249199,
                  p99: 253150,
                },
              },
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
      ).value.observed
    ).toMatchObject({
      observed_kibana_instances: 1,
      minutes_to_drain_overdue: 0,
      // on average it takes at least 50% of tasks 2 polling cycles before they complete
      // this reduces the overall throughput of task manager
      max_throughput_per_minute: 100,
    });
  });

  test('estimates the max throughput per minute when duration by persistence is empty', async () => {
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
              duration_by_persistence: {},
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
      ).value.observed
    ).toMatchObject({
      observed_kibana_instances: 1,
      minutes_to_drain_overdue: 0,
      max_throughput_per_minute: 200,
    });
  });

  test('estimates the max throughput per minute based on the workload and the assumed kibana instances when there are tasks that repeat each hour or day', async () => {
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
              duration_by_persistence: {
                ephemeral: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                non_recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
              },
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
      ).value.observed
    ).toMatchObject({
      observed_kibana_instances: 1,
      minutes_to_drain_overdue: 0,
      max_throughput_per_minute: 200,
    });
  });

  test('estimates the max throughput available when there are no active Kibana', async () => {
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
              duration_by_persistence: {
                ephemeral: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                non_recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
              },
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
      ).value.observed
    ).toMatchObject({
      observed_kibana_instances: 1,
      minutes_to_drain_overdue: 0,
      max_throughput_per_minute: 200,
    });
  });

  test('estimates the max throughput available to handle the workload when there are multiple active kibana instances', async () => {
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
              duration_by_persistence: {
                ephemeral: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                non_recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
              },
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
      ).value.observed
    ).toMatchObject({
      observed_kibana_instances: 3,
      minutes_to_drain_overdue: 0,
      max_throughput_per_minute: 3 * 200, // 3 kibana, 200tpm each
      avg_required_throughput_per_minute: 150 + 1, // 150 every minute, plus 60 every hour
      avg_required_throughput_per_minute_per_kibana: Math.ceil((150 + 1) / 3),
    });
  });

  test('estimates the max throughput available to handle the workload and historical non-recurring tasks when there are multiple active kibana instances', async () => {
    const provisionedKibanaInstances = 2;
    // 50% for non-recurring/epehemral + a 3rd of recurring task workload
    const expectedAverageRequiredCapacityPerKibana = 200 * 0.5 + (150 + 1) / 2;

    expect(
      estimateCapacity(
        mockStats(
          { max_workers: 10, poll_interval: 3000 },
          {
            owner_ids: provisionedKibanaInstances,
            overdue_non_recurring: 0,
            capacity_requirments: {
              per_minute: 150,
              per_hour: 60,
              per_day: 0,
            },
          },
          {
            load: {
              p50: 40,
              // assume running at 100% capacity
              p90: 100,
              p95: 100,
              p99: 100,
            },
            execution: {
              duration: {},
              duration_by_persistence: {
                ephemeral: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                non_recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
              },
              persistence: {
                // 50% of tasks are non-recurring/ephemeral executions in the system in recent history
                ephemeral: 25,
                non_recurring: 25,
                recurring: 50,
              },
              result_frequency_percent_as_number: {},
            },
          }
        )
      ).value.observed
    ).toMatchObject({
      observed_kibana_instances: provisionedKibanaInstances,
      minutes_to_drain_overdue: 0,
      max_throughput_per_minute: provisionedKibanaInstances * 200, // 2 kibana, 200tpm each
      avg_required_throughput_per_minute_per_kibana: Math.ceil(
        expectedAverageRequiredCapacityPerKibana
      ),
      avg_required_throughput_per_minute: Math.ceil(
        provisionedKibanaInstances * expectedAverageRequiredCapacityPerKibana
      ), // same as above but for both instances
    });
  });

  test('estimates the min required kibana instances when there is sufficient capacity for recurring but not for non-recurring/ephemeral', async () => {
    const provisionedKibanaInstances = 2;
    const recurringTasksPerMinute = 251;
    // 50% for non-recurring/epehemral + half of recurring task workload
    // there is insufficent capacity for this, but this is what the workload requires of the Kibana instances
    const expectedAverageRequiredCapacityPerKibanaCurrently =
      200 * 0.5 + recurringTasksPerMinute / provisionedKibanaInstances;
    const expectedAverageRequiredCapacityPerKibanaOnceThereAreEnoughServers =
      // the non-recurring task load should now be shared between 3 server instead of 2
      (200 * 0.5 * provisionedKibanaInstances) / (provisionedKibanaInstances + 1) +
      // so will the recurring tasks
      recurringTasksPerMinute / (provisionedKibanaInstances + 1);

    expect(
      estimateCapacity(
        mockStats(
          { max_workers: 10, poll_interval: 3000 },
          {
            owner_ids: provisionedKibanaInstances,
            overdue_non_recurring: 0,
            capacity_requirments: {
              per_minute: recurringTasksPerMinute,
              per_hour: 0,
              per_day: 0,
            },
          },
          {
            load: {
              p50: 40,
              // assume running at 100% capacity
              p90: 100,
              p95: 100,
              p99: 100,
            },
            execution: {
              duration: {},
              duration_by_persistence: {
                ephemeral: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                non_recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
              },
              persistence: {
                // 50% of tasks are non-recurring/ephemeral executions in the system in recent history
                ephemeral: 25,
                non_recurring: 25,
                recurring: 50,
              },
              result_frequency_percent_as_number: {},
            },
          }
        )
      ).value
    ).toMatchObject({
      observed: {
        observed_kibana_instances: provisionedKibanaInstances,
        minutes_to_drain_overdue: 0,
        max_throughput_per_minute: provisionedKibanaInstances * 200, // 2 kibana, 200tpm each
        avg_recurring_required_throughput_per_minute: Math.ceil(recurringTasksPerMinute),
        avg_required_throughput_per_minute_per_kibana: Math.ceil(
          expectedAverageRequiredCapacityPerKibanaCurrently
        ),
        avg_required_throughput_per_minute: Math.ceil(
          provisionedKibanaInstances * expectedAverageRequiredCapacityPerKibanaCurrently
        ), // same as above bt for both instances
      },
      proposed: {
        provisioned_kibana: provisionedKibanaInstances + 1,
        min_required_kibana: provisionedKibanaInstances,
        avg_recurring_required_throughput_per_minute_per_kibana: Math.ceil(
          recurringTasksPerMinute / (provisionedKibanaInstances + 1)
        ),
        avg_required_throughput_per_minute_per_kibana: Math.ceil(
          expectedAverageRequiredCapacityPerKibanaOnceThereAreEnoughServers
        ),
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
              duration_by_persistence: {
                ephemeral: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                non_recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
              },
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
      value: expect.any(Object),
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
              duration_by_persistence: {
                ephemeral: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                non_recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
              },
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
      value: expect.any(Object),
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
              duration_by_persistence: {
                ephemeral: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                non_recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
              },
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
      value: expect.any(Object),
    });
  });

  test('recommmends a 20% increase in kibana when a spike in non-recurring tasks forces recurring task capacity to zero', async () => {
    expect(
      estimateCapacity(
        mockStats(
          { max_workers: 10, poll_interval: 3000 },
          {
            owner_ids: 1,
            overdue_non_recurring: 0,
            capacity_requirments: {
              per_minute: 28,
              per_hour: 27,
              per_day: 2,
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
              duration_by_persistence: {
                ephemeral: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                non_recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
              },
              persistence: {
                recurring: 0,
                non_recurring: 70,
                ephemeral: 30,
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
        observed: {
          observed_kibana_instances: 1,
          avg_recurring_required_throughput_per_minute: 29,
          // we obesrve 100% capacity on non-recurring/ephemeral tasks, which is 200tpm
          // and add to that the 29tpm for recurring tasks
          avg_required_throughput_per_minute_per_kibana: 229,
        },
        proposed: {
          provisioned_kibana: 2,
          min_required_kibana: 1,
          avg_recurring_required_throughput_per_minute_per_kibana: 15,
          // once 2 kibana are provisioned, avg_required_throughput_per_minute_per_kibana is divided by 2, hence 115
          avg_required_throughput_per_minute_per_kibana: 115,
        },
      },
    });
  });

  test('recommmends a 20% increase in kibana when a spike in non-recurring tasks in a system with insufficient capacity even for recurring tasks', async () => {
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
              duration_by_persistence: {
                ephemeral: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                non_recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
                recurring: {
                  p50: 400,
                  p90: 500,
                  p95: 1200,
                  p99: 1500,
                },
              },
              persistence: {
                recurring: 0,
                non_recurring: 70,
                ephemeral: 30,
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
        observed: {
          observed_kibana_instances: 1,
          avg_recurring_required_throughput_per_minute: 210,
          // we obesrve 100% capacity on non-recurring/ephemeral tasks, which is 200tpm
          // and add to that the 210tpm for recurring tasks
          avg_required_throughput_per_minute_per_kibana: 410,
        },
        proposed: {
          // we propose provisioning 3 instances for recurring + non-recurring/ephemeral
          provisioned_kibana: 3,
          // but need at least 2 for recurring
          min_required_kibana: 2,
          avg_recurring_required_throughput_per_minute_per_kibana: 210 / 3,
          // once 3 kibana are provisioned, avg_required_throughput_per_minute_per_kibana is divided by 3, hence 137
          avg_required_throughput_per_minute_per_kibana: Math.ceil(410 / 3),
        },
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
          duration_by_persistence: {
            ephemeral: {
              p50: 400,
              p90: 500,
              p95: 1200,
              p99: 1500,
            },
            non_recurring: {
              p50: 400,
              p90: 500,
              p95: 1200,
              p99: 1500,
            },
            recurring: {
              p50: 400,
              p90: 500,
              p95: 1200,
              p99: 1500,
            },
          },
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
