/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { configSchema, TaskManagerConfig } from '../config';
import { HealthStatus } from '../monitoring';
import { MonitoredHealth } from '../routes/health';
import { logHealthMetrics, resetLastLogLevel } from './log_health_metrics';
import { Logger } from '@kbn/core/server';
import { TaskPersistence } from '../task_events';

jest.mock('./calculate_health_status', () => ({
  calculateHealthStatus: jest.fn(),
}));

describe('logHealthMetrics', () => {
  afterEach(() => {
    const { calculateHealthStatus } = jest.requireMock('./calculate_health_status');
    // Reset the last state by running through this as OK
    // (calculateHealthStatus as jest.Mock<HealthStatus>).mockImplementation(() => HealthStatus.OK);
    resetLastLogLevel();
    (calculateHealthStatus as jest.Mock<HealthStatus>).mockReset();
  });

  it('should log a warning message to enable verbose logging when the status goes from OK to Warning/Error', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_health_verbose_log: {
        enabled: false,
        warn_delayed_task_start_in_seconds: 60,
      },
    });
    const health = getMockMonitoredHealth();
    const { calculateHealthStatus } = jest.requireMock('./calculate_health_status');

    // We must change from OK to Warning
    (calculateHealthStatus as jest.Mock<HealthStatus>).mockImplementation(() => HealthStatus.OK);
    logHealthMetrics(health, logger, config);
    (calculateHealthStatus as jest.Mock<HealthStatus>).mockImplementation(
      () => HealthStatus.Warning
    );
    logHealthMetrics(health, logger, config);
    // We must change from OK to Error
    (calculateHealthStatus as jest.Mock<HealthStatus>).mockImplementation(() => HealthStatus.OK);
    logHealthMetrics(health, logger, config);
    (calculateHealthStatus as jest.Mock<HealthStatus>).mockImplementation(() => HealthStatus.Error);
    logHealthMetrics(health, logger, config);

    const debugCalls = (logger as jest.Mocked<Logger>).debug.mock.calls;
    const performanceMessage = /^Task Manager detected a degradation in performance/;
    const lastStatsMessage = /^Latest Monitored Stats: \{.*\}$/;
    expect(debugCalls[0][0] as string).toMatch(lastStatsMessage);
    expect(debugCalls[1][0] as string).toMatch(lastStatsMessage);
    expect(debugCalls[2][0] as string).toMatch(performanceMessage);
    expect(debugCalls[3][0] as string).toMatch(lastStatsMessage);
    expect(debugCalls[4][0] as string).toMatch(lastStatsMessage);
    expect(debugCalls[5][0] as string).toMatch(performanceMessage);
  });

  it('should not log a warning message to enable verbose logging when the status goes from Warning to OK', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_health_verbose_log: {
        enabled: false,
        warn_delayed_task_start_in_seconds: 60,
      },
    });
    const health = getMockMonitoredHealth();
    const { calculateHealthStatus } = jest.requireMock('./calculate_health_status');

    // We must change from Warning to OK
    (calculateHealthStatus as jest.Mock<HealthStatus>).mockImplementation(
      () => HealthStatus.Warning
    );
    logHealthMetrics(health, logger, config);
    (calculateHealthStatus as jest.Mock<HealthStatus>).mockImplementation(() => HealthStatus.OK);
    logHealthMetrics(health, logger, config);
    expect((logger as jest.Mocked<Logger>).warn).not.toHaveBeenCalled();
  });

  it('should not log a warning message to enable verbose logging when the status goes from Error to OK', () => {
    // console.log('start', getLastLogLevel());
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_health_verbose_log: {
        enabled: false,
        warn_delayed_task_start_in_seconds: 60,
      },
    });
    const health = getMockMonitoredHealth();
    const { calculateHealthStatus } = jest.requireMock('./calculate_health_status');

    // We must change from Error to OK
    (calculateHealthStatus as jest.Mock<HealthStatus>).mockImplementation(() => HealthStatus.Error);
    logHealthMetrics(health, logger, config);
    (calculateHealthStatus as jest.Mock<HealthStatus>).mockImplementation(() => HealthStatus.OK);
    logHealthMetrics(health, logger, config);
    expect((logger as jest.Mocked<Logger>).warn).not.toHaveBeenCalled();
  });

  it('should log as debug if status is OK', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_health_verbose_log: {
        enabled: true,
        warn_delayed_task_start_in_seconds: 60,
      },
    });
    const health = getMockMonitoredHealth();

    logHealthMetrics(health, logger, config);

    const firstDebug = JSON.parse(
      (logger as jest.Mocked<Logger>).debug.mock.calls[0][0].replace('Latest Monitored Stats: ', '')
    );
    expect(firstDebug).toMatchObject(health);
  });

  it('should log as debug if status is OK even if not enabled', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_health_verbose_log: {
        enabled: false,
        warn_delayed_task_start_in_seconds: 60,
      },
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
      monitored_stats_health_verbose_log: {
        enabled: true,
        warn_delayed_task_start_in_seconds: 60,
      },
    });
    const health = getMockMonitoredHealth();
    const { calculateHealthStatus } = jest.requireMock('./calculate_health_status');
    (calculateHealthStatus as jest.Mock<HealthStatus>).mockImplementation(
      () => HealthStatus.Warning
    );

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
      monitored_stats_health_verbose_log: {
        enabled: true,
        warn_delayed_task_start_in_seconds: 60,
      },
    });
    const health = getMockMonitoredHealth();
    const { calculateHealthStatus } = jest.requireMock('./calculate_health_status');
    (calculateHealthStatus as jest.Mock<HealthStatus>).mockImplementation(() => HealthStatus.Error);

    logHealthMetrics(health, logger, config);

    const logMessage = JSON.parse(
      ((logger as jest.Mocked<Logger>).error.mock.calls[0][0] as string).replace(
        'Latest Monitored Stats: ',
        ''
      )
    );
    expect(logMessage).toMatchObject(health);
  });

  it('should log as warn if drift exceeds the threshold for a single alert type', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_health_verbose_log: {
        enabled: true,
        warn_delayed_task_start_in_seconds: 60,
      },
    });
    const health = getMockMonitoredHealth({
      stats: {
        runtime: {
          value: {
            drift_by_type: {
              'taskType:test': {
                p99: 60000,
              },
              'taskType:test2': {
                p99: 60000 - 1,
              },
            },
            drift: {
              p99: 60000,
            },
          },
        },
      },
    });

    logHealthMetrics(health, logger, config);

    expect((logger as jest.Mocked<Logger>).warn.mock.calls[0][0] as string).toBe(
      `Detected delay task start of 60s for task(s) \"taskType:test\" (which exceeds configured value of 60s)`
    );

    const secondMessage = JSON.parse(
      ((logger as jest.Mocked<Logger>).warn.mock.calls[1][0] as string).replace(
        `Latest Monitored Stats: `,
        ''
      )
    );
    expect(secondMessage).toMatchObject(health);
  });

  it('should log as warn if drift exceeds the threshold for multiple alert types', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_health_verbose_log: {
        enabled: true,
        warn_delayed_task_start_in_seconds: 60,
      },
    });
    const health = getMockMonitoredHealth({
      stats: {
        runtime: {
          value: {
            drift_by_type: {
              'taskType:test': {
                p99: 60000,
              },
              'taskType:test2': {
                p99: 60000,
              },
            },
            drift: {
              p99: 60000,
            },
          },
        },
      },
    });

    logHealthMetrics(health, logger, config);

    expect((logger as jest.Mocked<Logger>).warn.mock.calls[0][0] as string).toBe(
      `Detected delay task start of 60s for task(s) \"taskType:test, taskType:test2\" (which exceeds configured value of 60s)`
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
      monitored_stats_health_verbose_log: {
        enabled: true,
        warn_delayed_task_start_in_seconds: 60,
      },
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

  it('should ignore capacity estimation status', () => {
    const logger = loggingSystemMock.create().get();
    const config = getTaskManagerConfig({
      monitored_stats_health_verbose_log: {
        enabled: true,
        warn_delayed_task_start_in_seconds: 60,
      },
    });
    const health = getMockMonitoredHealth({
      stats: {
        capacity_estimation: {
          status: HealthStatus.Warning,
        },
      },
    });

    logHealthMetrics(health, logger, config);

    const { calculateHealthStatus } = jest.requireMock('./calculate_health_status');
    expect(calculateHealthStatus).toBeCalledTimes(1);
    expect(calculateHealthStatus.mock.calls[0][0].stats.capacity_estimation).toBeUndefined();
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
          capacity_requirements: {
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
          drift_by_type: {
            'taskType:test': {
              p50: 1000,
              p90: 2000,
              p95: 2500,
              p99: 3000,
            },
          },
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
  return merge(stub, overrides) as unknown as MonitoredHealth;
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
