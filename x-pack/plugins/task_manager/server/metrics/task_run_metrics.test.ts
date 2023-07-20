/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import sinon from 'sinon';
import * as uuid from 'uuid';
import { Subject, Observable } from 'rxjs';
import { take, bufferCount, skip } from 'rxjs/operators';
import { asTaskRunEvent, TaskPersistence } from '../task_events';
import { asErr, asOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { AggregatedStat } from '../lib/runtime_statistics_aggregator';
import { taskPollingLifecycleMock } from '../polling_lifecycle.mock';
import { createTaskRunMetricsAggregator, TaskRunMetric } from './task_run_metrics';
import { TaskManagerConfig } from '../config';
import { TaskStatus } from '../task';
import { TaskRunResult } from '../task_running';

const configuration: TaskManagerConfig = {
  allow_reading_invalid_state: false,
  ephemeral_tasks: {
    enabled: true,
    request_capacity: 10,
  },
  event_loop_delay: {
    monitor: true,
    warn_threshold: 5000,
  },
  max_attempts: 9,
  max_workers: 10,
  metrics_reset_interval: 3000,
  monitored_aggregated_stats_refresh_rate: 5000,
  monitored_stats_health_verbose_log: {
    enabled: false,
    level: 'debug' as const,
    warn_delayed_task_start_in_seconds: 60,
  },
  monitored_stats_required_freshness: 6000000,
  monitored_stats_running_average_window: 50,
  monitored_task_execution_thresholds: {
    custom: {},
    default: {
      error_threshold: 90,
      warn_threshold: 80,
    },
  },
  poll_interval: 6000000,
  request_capacity: 1000,
  requeue_invalid_tasks: {
    enabled: false,
    delay: 3000,
    max_attempts: 20,
  },
  unsafe: {
    authenticate_background_task_utilization: true,
    exclude_task_types: [],
  },
  version_conflict_threshold: 80,
  worker_utilization_running_average_window: 5,
};

const getTaskRunSuccessEvent = (type: string) => {
  const id = uuid.v4();
  return asTaskRunEvent(
    id,
    asOk({
      task: {
        id,
        attempts: 0,
        status: TaskStatus.Running,
        version: '123',
        runAt: new Date(),
        scheduledAt: new Date(),
        startedAt: new Date(),
        retryAt: new Date(Date.now() + 5 * 60 * 1000),
        state: {},
        taskType: type,
        params: {},
        ownerId: null,
      },
      persistence: TaskPersistence.Recurring,
      result: TaskRunResult.Success,
    }),
    {
      start: 1689698780490,
      stop: 1689698780500,
    }
  );
};

const getTaskRunFailedEvent = (type: string) => {
  const id = uuid.v4();
  return asTaskRunEvent(
    id,
    asErr({
      error: new Error('task failed to run'),
      task: {
        id,
        attempts: 0,
        status: TaskStatus.Running,
        version: '123',
        runAt: new Date(),
        scheduledAt: new Date(),
        startedAt: new Date(),
        retryAt: new Date(Date.now() + 5 * 60 * 1000),
        state: {},
        taskType: type,
        params: {},
        ownerId: null,
      },
      persistence: TaskPersistence.Recurring,
      result: TaskRunResult.Failed,
    })
  );
};

describe('Task Run Metrics', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  describe('createTaskRunMetricsAggregator', () => {
    test('returns a cumulative count of successful task runs and total task runs, broken down by type', async () => {
      const taskRunEvents = [
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunSuccessEvent('telemetry'),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunSuccessEvent('report'),
        getTaskRunFailedEvent('alerting:example'),
        getTaskRunSuccessEvent('alerting:.index-threshold'),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunFailedEvent('alerting:example'),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunFailedEvent('actions:webhook'),
      ];
      const events$ = new Subject<TaskLifecycleEvent>();
      const taskPollingLifecycle = taskPollingLifecycleMock.create({
        events$: events$ as Observable<TaskLifecycleEvent>,
      });

      const taskRunAggregator = createTaskRunMetricsAggregator(
        taskPollingLifecycle,
        configuration,
        new Subject<boolean>()
      );

      return new Promise<void>((resolve) => {
        taskRunAggregator
          .pipe(
            // skip initial metric which is just initialized data which
            // ensures we don't stall on combineLatest
            skip(1),
            take(taskRunEvents.length),
            bufferCount(taskRunEvents.length)
          )
          .subscribe((metrics: Array<AggregatedStat<TaskRunMetric>>) => {
            expect(metrics[0]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 1, total: 1 },
                by_type: {
                  alerting: { success: 1, total: 1 },
                  'alerting:example': { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[1]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 2, total: 2 },
                by_type: {
                  alerting: { success: 1, total: 1 },
                  'alerting:example': { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[2]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 3, total: 3 },
                by_type: {
                  alerting: { success: 2, total: 2 },
                  'alerting:example': { success: 2, total: 2 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[3]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 4, total: 4 },
                by_type: {
                  alerting: { success: 2, total: 2 },
                  'alerting:example': { success: 2, total: 2 },
                  report: { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[4]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 4, total: 5 },
                by_type: {
                  alerting: { success: 2, total: 3 },
                  'alerting:example': { success: 2, total: 3 },
                  report: { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[5]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 5, total: 6 },
                by_type: {
                  alerting: { success: 3, total: 4 },
                  'alerting:.index-threshold': { success: 1, total: 1 },
                  'alerting:example': { success: 2, total: 3 },
                  report: { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[6]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 6, total: 7 },
                by_type: {
                  alerting: { success: 4, total: 5 },
                  'alerting:.index-threshold': { success: 1, total: 1 },
                  'alerting:example': { success: 3, total: 4 },
                  report: { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[7]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 6, total: 8 },
                by_type: {
                  alerting: { success: 4, total: 6 },
                  'alerting:.index-threshold': { success: 1, total: 1 },
                  'alerting:example': { success: 3, total: 5 },
                  report: { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[8]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 7, total: 9 },
                by_type: {
                  alerting: { success: 5, total: 7 },
                  'alerting:.index-threshold': { success: 1, total: 1 },
                  'alerting:example': { success: 4, total: 6 },
                  report: { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[9]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 7, total: 10 },
                by_type: {
                  actions: { success: 0, total: 1 },
                  alerting: { success: 5, total: 7 },
                  'actions:webhook': { success: 0, total: 1 },
                  'alerting:.index-threshold': { success: 1, total: 1 },
                  'alerting:example': { success: 4, total: 6 },
                  report: { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            resolve();
          });

        for (const event of taskRunEvents) {
          events$.next(event);
        }
      });
    });

    test('resets count when resetMetric$ event is received', async () => {
      const resetMetric$ = new Subject<boolean>();
      const taskRunEvents1 = [
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunSuccessEvent('telemetry'),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunSuccessEvent('report'),
        getTaskRunFailedEvent('alerting:example'),
      ];

      const taskRunEvents2 = [
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunFailedEvent('alerting:example'),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunFailedEvent('actions:webhook'),
      ];
      const events$ = new Subject<TaskLifecycleEvent>();
      const taskPollingLifecycle = taskPollingLifecycleMock.create({
        events$: events$ as Observable<TaskLifecycleEvent>,
      });

      const taskRunAggregator = createTaskRunMetricsAggregator(
        taskPollingLifecycle,
        configuration,
        resetMetric$
      );

      return new Promise<void>((resolve) => {
        taskRunAggregator
          .pipe(
            // skip initial metric which is just initialized data which
            // ensures we don't stall on combineLatest
            skip(1),
            take(taskRunEvents1.length + taskRunEvents2.length),
            bufferCount(taskRunEvents1.length + taskRunEvents2.length)
          )
          .subscribe((metrics: Array<AggregatedStat<TaskRunMetric>>) => {
            expect(metrics[0]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 1, total: 1 },
                by_type: {
                  alerting: { success: 1, total: 1 },
                  'alerting:example': { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[1]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 2, total: 2 },
                by_type: {
                  alerting: { success: 1, total: 1 },
                  'alerting:example': { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[2]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 3, total: 3 },
                by_type: {
                  alerting: { success: 2, total: 2 },
                  'alerting:example': { success: 2, total: 2 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[3]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 4, total: 4 },
                by_type: {
                  alerting: { success: 2, total: 2 },
                  'alerting:example': { success: 2, total: 2 },
                  report: { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[4]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 4, total: 5 },
                by_type: {
                  alerting: { success: 2, total: 3 },
                  'alerting:example': { success: 2, total: 3 },
                  report: { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            // reset event should have been received here
            expect(metrics[5]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 1, total: 1 },
                by_type: {
                  alerting: { success: 1, total: 1 },
                  'alerting:example': { success: 1, total: 1 },
                  report: { success: 0, total: 0 },
                  telemetry: { success: 0, total: 0 },
                },
              },
            });
            expect(metrics[6]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 2, total: 2 },
                by_type: {
                  alerting: { success: 2, total: 2 },
                  'alerting:example': { success: 2, total: 2 },
                  report: { success: 0, total: 0 },
                  telemetry: { success: 0, total: 0 },
                },
              },
            });
            expect(metrics[7]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 2, total: 3 },
                by_type: {
                  alerting: { success: 2, total: 3 },
                  'alerting:example': { success: 2, total: 3 },
                  report: { success: 0, total: 0 },
                  telemetry: { success: 0, total: 0 },
                },
              },
            });
            expect(metrics[8]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 3, total: 4 },
                by_type: {
                  alerting: { success: 3, total: 4 },
                  'alerting:example': { success: 3, total: 4 },
                  report: { success: 0, total: 0 },
                  telemetry: { success: 0, total: 0 },
                },
              },
            });
            expect(metrics[9]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 3, total: 5 },
                by_type: {
                  actions: { success: 0, total: 1 },
                  alerting: { success: 3, total: 4 },
                  'actions:webhook': { success: 0, total: 1 },
                  'alerting:example': { success: 3, total: 4 },
                  report: { success: 0, total: 0 },
                  telemetry: { success: 0, total: 0 },
                },
              },
            });
            resolve();
          });

        for (const event of taskRunEvents1) {
          events$.next(event);
        }
        resetMetric$.next(true);
        for (const event of taskRunEvents2) {
          events$.next(event);
        }
      });
    });

    test('resets count when configured metrics reset interval expires', async () => {
      const clock = sinon.useFakeTimers();
      clock.tick(0);
      const taskRunEvents1 = [
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunSuccessEvent('telemetry'),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunSuccessEvent('report'),
        getTaskRunFailedEvent('alerting:example'),
      ];

      const taskRunEvents2 = [
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunFailedEvent('alerting:example'),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskRunFailedEvent('actions:webhook'),
      ];
      const events$ = new Subject<TaskLifecycleEvent>();
      const taskPollingLifecycle = taskPollingLifecycleMock.create({
        events$: events$ as Observable<TaskLifecycleEvent>,
      });

      const taskRunAggregator = createTaskRunMetricsAggregator(
        taskPollingLifecycle,
        {
          ...configuration,
          metrics_reset_interval: 10,
        },
        new Subject<boolean>()
      );

      return new Promise<void>((resolve) => {
        taskRunAggregator
          .pipe(
            // skip initial metric which is just initialized data which
            // ensures we don't stall on combineLatest
            skip(1),
            take(taskRunEvents1.length + taskRunEvents2.length),
            bufferCount(taskRunEvents1.length + taskRunEvents2.length)
          )
          .subscribe((metrics: Array<AggregatedStat<TaskRunMetric>>) => {
            expect(metrics[0]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 1, total: 1 },
                by_type: {
                  alerting: { success: 1, total: 1 },
                  'alerting:example': { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[1]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 2, total: 2 },
                by_type: {
                  alerting: { success: 1, total: 1 },
                  'alerting:example': { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[2]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 3, total: 3 },
                by_type: {
                  alerting: { success: 2, total: 2 },
                  'alerting:example': { success: 2, total: 2 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[3]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 4, total: 4 },
                by_type: {
                  alerting: { success: 2, total: 2 },
                  'alerting:example': { success: 2, total: 2 },
                  report: { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            expect(metrics[4]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 4, total: 5 },
                by_type: {
                  alerting: { success: 2, total: 3 },
                  'alerting:example': { success: 2, total: 3 },
                  report: { success: 1, total: 1 },
                  telemetry: { success: 1, total: 1 },
                },
              },
            });
            // reset event should have been received here
            expect(metrics[5]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 1, total: 1 },
                by_type: {
                  alerting: { success: 1, total: 1 },
                  'alerting:example': { success: 1, total: 1 },
                  report: { success: 0, total: 0 },
                  telemetry: { success: 0, total: 0 },
                },
              },
            });
            expect(metrics[6]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 2, total: 2 },
                by_type: {
                  alerting: { success: 2, total: 2 },
                  'alerting:example': { success: 2, total: 2 },
                  report: { success: 0, total: 0 },
                  telemetry: { success: 0, total: 0 },
                },
              },
            });
            expect(metrics[7]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 2, total: 3 },
                by_type: {
                  alerting: { success: 2, total: 3 },
                  'alerting:example': { success: 2, total: 3 },
                  report: { success: 0, total: 0 },
                  telemetry: { success: 0, total: 0 },
                },
              },
            });
            expect(metrics[8]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 3, total: 4 },
                by_type: {
                  alerting: { success: 3, total: 4 },
                  'alerting:example': { success: 3, total: 4 },
                  report: { success: 0, total: 0 },
                  telemetry: { success: 0, total: 0 },
                },
              },
            });
            expect(metrics[9]).toEqual({
              key: 'task_run',
              value: {
                overall: { success: 3, total: 5 },
                by_type: {
                  actions: { success: 0, total: 1 },
                  alerting: { success: 3, total: 4 },
                  'actions:webhook': { success: 0, total: 1 },
                  'alerting:example': { success: 3, total: 4 },
                  report: { success: 0, total: 0 },
                  telemetry: { success: 0, total: 0 },
                },
              },
            });
            resolve();
          });

        for (const event of taskRunEvents1) {
          events$.next(event);
        }
        clock.tick(20);
        for (const event of taskRunEvents2) {
          events$.next(event);
        }

        clock.restore();
      });
    });
  });
});
