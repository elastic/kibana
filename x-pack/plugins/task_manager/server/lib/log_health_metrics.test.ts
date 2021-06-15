/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';
import { loggingSystemMock } from 'src/core/server/mocks';
import { configSchema, TaskManagerConfig } from '../config';
import { HealthStatus } from '../monitoring';
import { TaskPersistence } from '../monitoring/task_run_statistics';
import { MonitoredHealth } from '../routes/health';
import { logHealthMetrics } from './log_health_metrics';
import { Logger } from '../../../../../src/core/server';

describe('logHealthMetrics', () => {
  it('should log as debug if status is OK', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_warn_delayed_task_start_in_seconds: 60,
    });
    const health = getMockMonitoredHealth();

    logHealthMetrics(health, logger, config);

    const firstDebug = JSON.parse(
      (logger as jest.Mocked<Logger>).debug.mock.calls[0][0].replace('Latest Monitored Stats: ', '')
    );
    expect(firstDebug).toMatchObject(health);
  });

  it('should log as warn if status is Warn', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_warn_delayed_task_start_in_seconds: 60,
    });
    const health = getMockMonitoredHealth({
      status: HealthStatus.Warning,
    });

    logHealthMetrics(health, logger, config);

    const logMessage = JSON.parse(
      ((logger as jest.Mocked<Logger>).warn.mock.calls[0][0] as string).replace(
        'Latest Monitored Stats: ',
        ''
      )
    );
    expect(logMessage).toMatchObject(health);
  });

  it('should log as error if status is Error', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_warn_delayed_task_start_in_seconds: 60,
    });
    const health = getMockMonitoredHealth({
      status: HealthStatus.Error,
    });

    logHealthMetrics(health, logger, config);

    const logMessage = JSON.parse(
      ((logger as jest.Mocked<Logger>).error.mock.calls[0][0] as string).replace(
        'Latest Monitored Stats: ',
        ''
      )
    );
    expect(logMessage).toMatchObject(health);
  });

  it('should log as warn if drift exceeds the threshold', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_warn_delayed_task_start_in_seconds: 60,
    });
    const health = getMockMonitoredHealth({
      stats: {
        runtime: {
          value: {
            drift: {
              p99: 60000,
            },
          },
        },
      },
    });

    logHealthMetrics(health, logger, config);

    expect((logger as jest.Mocked<Logger>).warn.mock.calls[0][0] as string).toBe(
      `Detected delay task start of 60s (which exceeds configured value of 60s)`
    );

    const secondMessage = JSON.parse(
      ((logger as jest.Mocked<Logger>).warn.mock.calls[1][0] as string).replace(
        `Latest Monitored Stats: `,
        ''
      )
    );
    expect(secondMessage).toMatchObject(health);
  });

  it('should log as debug if there are no stats', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_warn_delayed_task_start_in_seconds: 60,
    });
    const health = {
      id: '1',
      status: HealthStatus.OK,
      timestamp: new Date().toISOString(),
      last_update: new Date().toISOString(),
      stats: {},
    };

    logHealthMetrics(health, logger, config);

    const firstDebug = JSON.parse(
      (logger as jest.Mocked<Logger>).debug.mock.calls[0][0].replace('Latest Monitored Stats: ', '')
    );
    expect(firstDebug).toMatchObject(health);
  });
});

function getMockMonitoredHealth(overrides = {}): MonitoredHealth {
  const stub: MonitoredHealth = {
    id: '1',
    status: HealthStatus.OK,
    timestamp: new Date().toISOString(),
    last_update: new Date().toISOString(),
    stats: {
      configuration: {
        timestamp: new Date().toISOString(),
        status: HealthStatus.OK,
        value: {
          max_workers: 10,
          poll_interval: 3000,
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
        },
      },
      workload: {
        timestamp: new Date().toISOString(),
        status: HealthStatus.OK,
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
          estimatedScheduleDensity: [],
          non_recurring: 20,
          owner_ids: 2,
          estimated_schedule_density: [],
          capacity_requirments: {
            per_minute: 150,
            per_hour: 360,
            per_day: 820,
          },
        },
      },
      runtime: {
        timestamp: new Date().toISOString(),
        status: HealthStatus.OK,
        value: {
          drift: {
            p50: 1000,
            p90: 2000,
            p95: 2500,
            p99: 3000,
          },
          drift_by_type: {},
          load: {
            p50: 1000,
            p90: 2000,
            p95: 2500,
            p99: 3000,
          },
          execution: {
            duration: {},
            duration_by_persistence: {},
            persistence: {
              [TaskPersistence.Recurring]: 10,
              [TaskPersistence.NonRecurring]: 10,
              [TaskPersistence.Ephemeral]: 10,
            },
            result_frequency_percent_as_number: {},
          },
          polling: {
            last_successful_poll: new Date().toISOString(),
            duration: [500, 400, 3000],
            claim_conflicts: [0, 100, 75],
            claim_mismatches: [0, 100, 75],
            result_frequency_percent_as_number: [
              'NoTasksClaimed',
              'NoTasksClaimed',
              'NoTasksClaimed',
            ],
          },
        },
      },
    },
  };
  return (merge(stub, overrides) as unknown) as MonitoredHealth;
}

function getTaskManagerConfig(overrides: Partial<TaskManagerConfig> = {}) {
  return configSchema.validate(
    overrides.monitored_stats_required_freshness
      ? {
          // use `monitored_stats_required_freshness` as poll interval otherwise we might
          // fail validation as it must be greather than the poll interval
          poll_interval: overrides.monitored_stats_required_freshness,
          ...overrides,
        }
      : overrides
  );
}
