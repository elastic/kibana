/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { set } from '@kbn/safer-lodash-set';
import { HealthStatus, RawMonitoringStats } from '../monitoring';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { calculateHealthStatus } from './calculate_health_status';
import { cloneDeep } from 'lodash';

const now = '2023-05-09T13:00:00.000Z';
Date.now = jest.fn().mockReturnValue(new Date(now));

const logger = loggingSystemMock.create().get();
const config = {
  enabled: true,
  max_workers: 10,
  index: 'foo',
  max_attempts: 9,
  poll_interval: 3000,
  version_conflict_threshold: 80,
  request_capacity: 1000,
  allow_reading_invalid_state: false,
  monitored_aggregated_stats_refresh_rate: 5000,
  monitored_stats_health_verbose_log: {
    enabled: false,
    level: 'debug' as const,
    warn_delayed_task_start_in_seconds: 60,
  },
  monitored_stats_required_freshness: 5000,
  monitored_stats_running_average_window: 50,
  monitored_task_execution_thresholds: {
    default: {
      error_threshold: 90,
      warn_threshold: 80,
    },
    custom: {},
  },
  ephemeral_tasks: {
    enabled: false,
    request_capacity: 10,
  },
  unsafe: {
    exclude_task_types: [],
    authenticate_background_task_utilization: true,
  },
  event_loop_delay: {
    monitor: true,
    warn_threshold: 5000,
  },
  worker_utilization_running_average_window: 5,
  requeue_invalid_tasks: {
    enabled: false,
    delay: 3000,
    max_attempts: 20,
  },
  metrics_reset_interval: 3000,
};

const getStatsWithTimestamp = ({
  timestamp,
  hotTimestamp,
}: {
  timestamp?: string;
  hotTimestamp?: string;
} = {}): RawMonitoringStats => {
  timestamp = timestamp ?? '2023-05-09T12:59:57.000Z';
  hotTimestamp = hotTimestamp ?? timestamp;
  return {
    last_update: timestamp,
    stats: {
      configuration: {
        timestamp,
        value: {
          request_capacity: 1000,
          monitored_aggregated_stats_refresh_rate: 5000,
          monitored_stats_running_average_window: 50,
          monitored_task_execution_thresholds: {
            custom: {},
            default: {
              error_threshold: 90,
              warn_threshold: 80,
            },
          },
          poll_interval: 3000,
          max_workers: 10,
        },
        status: HealthStatus.OK,
      },
      runtime: {
        timestamp,
        value: {
          polling: {
            last_successful_poll: hotTimestamp,
            last_polling_delay: timestamp,
            claim_duration: {
              p50: 15,
              p90: 152,
              p95: 175.99999999999972,
              p99: 1025,
            },
            duration: {
              p50: 135,
              p90: 303.8,
              p95: 547.3999999999978,
              p99: 1099,
            },
            claim_conflicts: {
              p50: 0,
              p90: 0,
              p95: 0,
              p99: 0,
            },
            claim_mismatches: {
              p50: 0,
              p90: 0,
              p95: 0,
              p99: 0,
            },
            result_frequency_percent_as_number: {
              Failed: 0,
              NoAvailableWorkers: 0,
              NoTasksClaimed: 83,
              RanOutOfCapacity: 4,
              RunningAtCapacity: 4,
              PoolFilled: 8,
            },
            persistence: {
              recurring: 95,
              non_recurring: 5,
            },
          },
          drift: {
            p50: 3110.5,
            p90: 5871,
            p95: 8058.400000000001,
            p99: 8167,
          },
          drift_by_type: {
            taskType1: {
              p50: 2944,
              p90: 2944,
              p95: 2944,
              p99: 2944,
            },
            taskType2: {
              p50: 2949,
              p90: 2949,
              p95: 2949,
              p99: 2949,
            },
          },
          load: {
            p50: 10,
            p90: 100,
            p95: 100,
            p99: 100,
          },
          execution: {
            duration: {
              taskType1: {
                p50: 49,
                p90: 49,
                p95: 49,
                p99: 49,
              },
              taskType2: {
                p50: 68,
                p90: 68,
                p95: 68,
                p99: 68,
              },
            },
            duration_by_persistence: {
              recurring: {
                p50: 53,
                p90: 871.4999999999999,
                p95: 1050.399999999999,
                p99: 1915,
              },
              non_recurring: {
                p50: 441.5,
                p90: 876,
                p95: 876,
                p99: 876,
              },
            },
            persistence: {
              recurring: 95,
              non_recurring: 5,
              ephemeral: 0,
            },
            result_frequency_percent_as_number: {
              taskType1: {
                Success: 100,
                RetryScheduled: 0,
                Failed: 0,
                status: HealthStatus.OK,
              },
              taskType2: {
                Success: 100,
                RetryScheduled: 0,
                Failed: 0,
                status: HealthStatus.OK,
              },
            },
          },
        },
        status: HealthStatus.OK,
      },
      workload: {
        timestamp,
        value: {
          count: 2,
          task_types: {
            taskType1: {
              count: 1,
              status: {
                idle: 1,
              },
            },
            taskType2: {
              count: 1,
              status: {
                idle: 1,
              },
            },
          },
          non_recurring: 2,
          owner_ids: 0,
          schedule: [['5m', 2]],
          overdue: 0,
          overdue_non_recurring: 0,
          estimated_schedule_density: [
            0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          ],
          capacity_requirements: {
            per_minute: 21,
            per_hour: 47,
            per_day: 33,
          },
        },
        status: HealthStatus.OK,
      },
    },
  };
};

describe('calculateHealthStatus', () => {
  test('should return OK status when stats are fresh', () => {
    expect(calculateHealthStatus(getStatsWithTimestamp(), config, true, logger)).toEqual({
      status: HealthStatus.OK,
    });
  });

  test('should return OK status when stats are not yet populated', () => {
    expect(
      calculateHealthStatus(
        {
          last_update: '2023-05-09T12:59:57.000Z',
          stats: {},
        },
        config,
        true,
        logger
      )
    ).toEqual({ status: HealthStatus.Warning, reason: `no health stats available` });
  });

  test('should return error status if any stat has status error', () => {
    const errorReason = `setting HealthStatus.Error because assumedRequiredThroughputPerMinutePerKibana (222.85972222222222) >= capacityPerMinutePerKibana (200) AND assumedAverageRecurringRequiredThroughputPerMinutePerKibana (222.85972222222222) >= capacityPerMinutePerKibana (200)`;
    const stats = getStatsWithTimestamp();
    set(stats, 'stats.capacity_estimation.reason', errorReason);

    ['configuration', 'runtime', 'workload'].forEach((key: string) => {
      expect(
        calculateHealthStatus(
          set(cloneDeep(stats), `stats.${key}.status`, HealthStatus.Error),
          config,
          true,
          logger
        )
      ).toEqual({ status: HealthStatus.Error, reason: errorReason });
    });
  });

  test('should return warning status if any stat has status warning', () => {
    const warningReason = `setting HealthStatus.Error because assumedRequiredThroughputPerMinutePerKibana (222.85972222222222) < capacityPerMinutePerKibana (200)`;
    const stats = getStatsWithTimestamp();
    set(stats, 'stats.capacity_estimation.reason', warningReason);

    ['configuration', 'runtime', 'workload'].forEach((key: string) => {
      expect(
        calculateHealthStatus(
          set(cloneDeep(stats), `stats.${key}.status`, HealthStatus.Warning),
          config,
          true,
          logger
        )
      ).toEqual({ status: HealthStatus.Warning, reason: warningReason });
    });
  });

  test('should return error if hot timestamps are expired and shouldRunTasks is true', () => {
    expect(
      calculateHealthStatus(
        getStatsWithTimestamp({ hotTimestamp: '2023-05-08T12:59:57.000Z' }),
        config,
        true,
        logger
      )
    ).toEqual({
      status: HealthStatus.Error,
      reason: 'setting HealthStatus.Error because of expired hot timestamps',
    });
  });

  test('should return ok if hot timestamps are expired but shouldRunTasks is false', () => {
    expect(
      calculateHealthStatus(
        getStatsWithTimestamp({ hotTimestamp: '2023-05-08T12:59:57.000Z' }),
        config,
        false,
        logger
      )
    ).toEqual({ status: HealthStatus.OK });
  });

  test('should return error if cold timestamps are expired', () => {
    expect(
      calculateHealthStatus(
        getStatsWithTimestamp({ timestamp: '2023-05-08T12:59:57.000Z' }),
        config,
        true,
        logger
      )
    ).toEqual({
      status: HealthStatus.Error,
      reason: 'setting HealthStatus.Error because of expired hot timestamps',
    });
  });
});
