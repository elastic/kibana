/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Subject } from 'rxjs';
import { merge } from 'lodash';
import { loggingSystemMock } from 'src/core/server/mocks';
import {
  Collector,
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from 'src/plugins/usage_collection/server/mocks';
import { HealthStatus } from '../monitoring';
import { MonitoredHealth } from '../routes/health';
import { TaskPersistence } from '../task_events';
import { registerTaskManagerUsageCollector } from './task_manager_usage_collector';
import { sleep } from '../test_utils';
import { TaskManagerUsage } from './types';

describe('registerTaskManagerUsageCollector', () => {
  let collector: Collector<unknown>;
  const logger = loggingSystemMock.createLogger();

  it('should report telemetry on the ephemeral queue', async () => {
    const monitoringStats$ = new Subject<MonitoredHealth>();
    const usageCollectionMock = createUsageCollectionSetupMock();
    const fetchContext = createCollectorFetchContextMock();
    usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
      collector = new Collector(logger, config);
      return createUsageCollectionSetupMock().makeUsageCollector(config);
    });

    registerTaskManagerUsageCollector(usageCollectionMock, monitoringStats$, true, 10, []);

    const mockHealth = getMockMonitoredHealth();
    monitoringStats$.next(mockHealth);
    await sleep(1001);

    expect(usageCollectionMock.makeUsageCollector).toBeCalled();
    const telemetry: TaskManagerUsage = (await collector.fetch(fetchContext)) as TaskManagerUsage;
    expect(telemetry.ephemeral_tasks_enabled).toBe(true);
    expect(telemetry.ephemeral_request_capacity).toBe(10);
    expect(telemetry.ephemeral_stats).toMatchObject({
      status: mockHealth.stats.ephemeral?.status,
      load: mockHealth.stats.ephemeral?.value.load,
      executions_per_cycle: mockHealth.stats.ephemeral?.value.executionsPerCycle,
      queued_tasks: mockHealth.stats.ephemeral?.value.queuedTasks,
    });
  });

  it('should report telemetry on the excluded task types', async () => {
    const monitoringStats$ = new Subject<MonitoredHealth>();
    const usageCollectionMock = createUsageCollectionSetupMock();
    const fetchContext = createCollectorFetchContextMock();
    usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
      collector = new Collector(logger, config);
      return createUsageCollectionSetupMock().makeUsageCollector(config);
    });

    registerTaskManagerUsageCollector(usageCollectionMock, monitoringStats$, true, 10, [
      'actions:*',
    ]);

    const mockHealth = getMockMonitoredHealth();
    monitoringStats$.next(mockHealth);
    await sleep(1001);

    expect(usageCollectionMock.makeUsageCollector).toBeCalled();
    const telemetry: TaskManagerUsage = (await collector.fetch(fetchContext)) as TaskManagerUsage;
    expect(telemetry.task_type_exclusion).toEqual(['actions:*']);
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
      ephemeral: {
        status: HealthStatus.OK,
        timestamp: new Date().toISOString(),
        value: {
          load: {
            p50: 4,
            p90: 6,
            p95: 6,
            p99: 6,
          },
          executionsPerCycle: {
            p50: 4,
            p90: 6,
            p95: 6,
            p99: 6,
          },
          queuedTasks: {
            p50: 4,
            p90: 6,
            p95: 6,
            p99: 6,
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
  return merge(stub, overrides) as unknown as MonitoredHealth;
}
