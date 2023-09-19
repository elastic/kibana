/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { Subject } from 'rxjs';
import { take, bufferCount, skip } from 'rxjs/operators';
import {
  isTaskManagerMetricEvent,
  isTaskManagerStatEvent,
  isTaskPollingCycleEvent,
  isTaskRunEvent,
} from '../task_events';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { AggregatedStat } from '../lib/runtime_statistics_aggregator';
import { TaskManagerConfig } from '../config';
import { createAggregator } from './create_aggregator';
import { TaskClaimMetric, TaskClaimMetricsAggregator } from './task_claim_metrics_aggregator';
import { taskClaimFailureEvent, taskClaimSuccessEvent } from './task_claim_metrics_aggregator.test';
import {
  getTaskRunFailedEvent,
  getTaskRunSuccessEvent,
  getTaskManagerStatEvent,
} from './task_run_metrics_aggregator.test';
import { TaskRunMetric, TaskRunMetricsAggregator } from './task_run_metrics_aggregator';
import * as TaskClaimMetricsAggregatorModule from './task_claim_metrics_aggregator';
import { metricsAggregatorMock } from './metrics_aggregator.mock';
import { getTaskManagerMetricEvent } from './task_overdue_metrics_aggregator.test';
import { TaskOverdueMetric, TaskOverdueMetricsAggregator } from './task_overdue_metrics_aggregator';

const mockMetricsAggregator = metricsAggregatorMock.create();
const config: TaskManagerConfig = {
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
  metrics_reset_interval: 30000,
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

describe('createAggregator', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('with TaskClaimMetricsAggregator', () => {
    test('returns a cumulative count of successful polling cycles and total polling cycles', async () => {
      const events = [
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimFailureEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimFailureEvent,
        taskClaimSuccessEvent,
      ];
      const events$ = new Subject<TaskLifecycleEvent>();

      const taskClaimAggregator = createAggregator({
        key: 'task_claim',
        events$,
        config,
        reset$: new Subject<boolean>(),
        eventFilter: (event: TaskLifecycleEvent) => isTaskPollingCycleEvent(event),
        metricsAggregator: new TaskClaimMetricsAggregator(),
      });

      return new Promise<void>((resolve) => {
        taskClaimAggregator
          .pipe(
            // skip initial metric which is just initialized data which
            // ensures we don't stall on combineLatest
            skip(1),
            take(events.length),
            bufferCount(events.length)
          )
          .subscribe((metrics: Array<AggregatedStat<TaskClaimMetric>>) => {
            expect(metrics[0]).toEqual({
              key: 'task_claim',
              value: { success: 1, total: 1, duration: { counts: [1], values: [100] } },
            });
            expect(metrics[1]).toEqual({
              key: 'task_claim',
              value: { success: 2, total: 2, duration: { counts: [2], values: [100] } },
            });
            expect(metrics[2]).toEqual({
              key: 'task_claim',
              value: { success: 3, total: 3, duration: { counts: [3], values: [100] } },
            });
            expect(metrics[3]).toEqual({
              key: 'task_claim',
              value: { success: 4, total: 4, duration: { counts: [4], values: [100] } },
            });
            expect(metrics[4]).toEqual({
              key: 'task_claim',
              value: { success: 4, total: 5, duration: { counts: [4], values: [100] } },
            });
            expect(metrics[5]).toEqual({
              key: 'task_claim',
              value: { success: 5, total: 6, duration: { counts: [5], values: [100] } },
            });
            expect(metrics[6]).toEqual({
              key: 'task_claim',
              value: { success: 6, total: 7, duration: { counts: [6], values: [100] } },
            });
            expect(metrics[7]).toEqual({
              key: 'task_claim',
              value: { success: 7, total: 8, duration: { counts: [7], values: [100] } },
            });
            expect(metrics[8]).toEqual({
              key: 'task_claim',
              value: { success: 8, total: 9, duration: { counts: [8], values: [100] } },
            });
            expect(metrics[9]).toEqual({
              key: 'task_claim',
              value: { success: 8, total: 10, duration: { counts: [8], values: [100] } },
            });
            expect(metrics[10]).toEqual({
              key: 'task_claim',
              value: { success: 9, total: 11, duration: { counts: [9], values: [100] } },
            });
            resolve();
          });

        for (const event of events) {
          events$.next(event);
        }
      });
    });

    test('resets count when reset$ event is received', async () => {
      const reset$ = new Subject<boolean>();
      const events1 = [
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimFailureEvent,
        taskClaimSuccessEvent,
      ];

      const events2 = [
        taskClaimSuccessEvent,
        taskClaimFailureEvent,
        taskClaimFailureEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
      ];
      const events$ = new Subject<TaskLifecycleEvent>();

      const taskClaimAggregator = createAggregator({
        key: 'task_claim',
        events$,
        config,
        reset$,
        eventFilter: (event: TaskLifecycleEvent) => isTaskPollingCycleEvent(event),
        metricsAggregator: new TaskClaimMetricsAggregator(),
      });

      return new Promise<void>((resolve) => {
        taskClaimAggregator
          .pipe(
            // skip initial metric which is just initialized data which
            // ensures we don't stall on combineLatest
            skip(1),
            take(events1.length + events2.length),
            bufferCount(events1.length + events2.length)
          )
          .subscribe((metrics: Array<AggregatedStat<TaskClaimMetric>>) => {
            expect(metrics[0]).toEqual({
              key: 'task_claim',
              value: { success: 1, total: 1, duration: { counts: [1], values: [100] } },
            });
            expect(metrics[1]).toEqual({
              key: 'task_claim',
              value: { success: 2, total: 2, duration: { counts: [2], values: [100] } },
            });
            expect(metrics[2]).toEqual({
              key: 'task_claim',
              value: { success: 3, total: 3, duration: { counts: [3], values: [100] } },
            });
            expect(metrics[3]).toEqual({
              key: 'task_claim',
              value: { success: 4, total: 4, duration: { counts: [4], values: [100] } },
            });
            expect(metrics[4]).toEqual({
              key: 'task_claim',
              value: { success: 4, total: 5, duration: { counts: [4], values: [100] } },
            });
            expect(metrics[5]).toEqual({
              key: 'task_claim',
              value: { success: 5, total: 6, duration: { counts: [5], values: [100] } },
            });
            // reset event should have been received here
            expect(metrics[6]).toEqual({
              key: 'task_claim',
              value: { success: 1, total: 1, duration: { counts: [1], values: [100] } },
            });
            expect(metrics[7]).toEqual({
              key: 'task_claim',
              value: { success: 1, total: 2, duration: { counts: [1], values: [100] } },
            });
            expect(metrics[8]).toEqual({
              key: 'task_claim',
              value: { success: 1, total: 3, duration: { counts: [1], values: [100] } },
            });
            expect(metrics[9]).toEqual({
              key: 'task_claim',
              value: { success: 2, total: 4, duration: { counts: [2], values: [100] } },
            });
            expect(metrics[10]).toEqual({
              key: 'task_claim',
              value: { success: 3, total: 5, duration: { counts: [3], values: [100] } },
            });
            resolve();
          });

        for (const event of events1) {
          events$.next(event);
        }
        reset$.next(true);
        for (const event of events2) {
          events$.next(event);
        }
      });
    });

    test('resets count when configured metrics reset interval expires', async () => {
      const clock = sinon.useFakeTimers();
      clock.tick(0);
      const events1 = [
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimFailureEvent,
        taskClaimSuccessEvent,
      ];

      const events2 = [
        taskClaimSuccessEvent,
        taskClaimFailureEvent,
        taskClaimFailureEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
      ];
      const events$ = new Subject<TaskLifecycleEvent>();

      const taskClaimAggregator = createAggregator({
        key: 'task_claim',
        events$,
        config: {
          ...config,
          metrics_reset_interval: 10,
        },
        reset$: new Subject<boolean>(),
        eventFilter: (event: TaskLifecycleEvent) => isTaskPollingCycleEvent(event),
        metricsAggregator: new TaskClaimMetricsAggregator(),
      });

      return new Promise<void>((resolve) => {
        taskClaimAggregator
          .pipe(
            // skip initial metric which is just initialized data which
            // ensures we don't stall on combineLatest
            skip(1),
            take(events1.length + events2.length),
            bufferCount(events1.length + events2.length)
          )
          .subscribe((metrics: Array<AggregatedStat<TaskClaimMetric>>) => {
            expect(metrics[0]).toEqual({
              key: 'task_claim',
              value: { success: 1, total: 1, duration: { counts: [1], values: [100] } },
            });
            expect(metrics[1]).toEqual({
              key: 'task_claim',
              value: { success: 2, total: 2, duration: { counts: [2], values: [100] } },
            });
            expect(metrics[2]).toEqual({
              key: 'task_claim',
              value: { success: 3, total: 3, duration: { counts: [3], values: [100] } },
            });
            expect(metrics[3]).toEqual({
              key: 'task_claim',
              value: { success: 4, total: 4, duration: { counts: [4], values: [100] } },
            });
            expect(metrics[4]).toEqual({
              key: 'task_claim',
              value: { success: 4, total: 5, duration: { counts: [4], values: [100] } },
            });
            expect(metrics[5]).toEqual({
              key: 'task_claim',
              value: { success: 5, total: 6, duration: { counts: [5], values: [100] } },
            });
            // reset interval should have fired here
            expect(metrics[6]).toEqual({
              key: 'task_claim',
              value: { success: 1, total: 1, duration: { counts: [1], values: [100] } },
            });
            expect(metrics[7]).toEqual({
              key: 'task_claim',
              value: { success: 1, total: 2, duration: { counts: [1], values: [100] } },
            });
            expect(metrics[8]).toEqual({
              key: 'task_claim',
              value: { success: 1, total: 3, duration: { counts: [1], values: [100] } },
            });
            expect(metrics[9]).toEqual({
              key: 'task_claim',
              value: { success: 2, total: 4, duration: { counts: [2], values: [100] } },
            });
            expect(metrics[10]).toEqual({
              key: 'task_claim',
              value: { success: 3, total: 5, duration: { counts: [3], values: [100] } },
            });
            resolve();
          });

        for (const event of events1) {
          events$.next(event);
        }
        clock.tick(20);
        for (const event of events2) {
          events$.next(event);
        }

        clock.restore();
      });
    });
  });

  describe('with TaskRunMetricsAggregator', () => {
    test('returns a cumulative count of successful task runs, on time task runs and total task runs, broken down by type, along with histogram of run delays', async () => {
      const taskRunEvents = [
        getTaskManagerStatEvent(3.234),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(10.45),
        getTaskRunSuccessEvent('telemetry'),
        getTaskManagerStatEvent(3.454),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(35.45),
        getTaskRunSuccessEvent('report'),
        getTaskManagerStatEvent(8.85673),
        getTaskRunFailedEvent('alerting:example'),
        getTaskManagerStatEvent(4.5745),
        getTaskRunSuccessEvent('alerting:.index-threshold'),
        getTaskManagerStatEvent(11.564),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(3.78),
        getTaskRunFailedEvent('alerting:example'),
        getTaskManagerStatEvent(3.7863),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(3.245),
        getTaskRunFailedEvent('actions:webhook'),
      ];
      const events$ = new Subject<TaskLifecycleEvent>();

      const taskRunAggregator = createAggregator({
        key: 'task_run',
        events$,
        config,
        reset$: new Subject<boolean>(),
        eventFilter: (event: TaskLifecycleEvent) =>
          isTaskRunEvent(event) || isTaskManagerStatEvent(event),
        metricsAggregator: new TaskRunMetricsAggregator(),
      });

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
                overall: {
                  success: 0,
                  not_timed_out: 0,
                  total: 0,
                  delay: { counts: [1], values: [10] },
                },
              },
            });
            expect(metrics[1]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 1,
                  not_timed_out: 1,
                  total: 1,
                  delay: { counts: [1], values: [10] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[2]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 1,
                  not_timed_out: 1,
                  total: 1,
                  delay: { counts: [1, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[3]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 2,
                  total: 2,
                  delay: { counts: [1, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[4]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 2,
                  total: 2,
                  delay: { counts: [2, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[5]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 3,
                  total: 3,
                  delay: { counts: [2, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[6]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 3,
                  total: 3,
                  delay: { counts: [2, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[7]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 4,
                  not_timed_out: 4,
                  total: 4,
                  delay: { counts: [2, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[8]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 4,
                  not_timed_out: 4,
                  total: 4,
                  delay: { counts: [3, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[9]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 4,
                  not_timed_out: 5,
                  total: 5,
                  delay: { counts: [3, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 3, total: 3 },
                  'alerting:example': { success: 2, not_timed_out: 3, total: 3 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[10]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 4,
                  not_timed_out: 5,
                  total: 5,
                  delay: { counts: [4, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 3, total: 3 },
                  'alerting:example': { success: 2, not_timed_out: 3, total: 3 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[11]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 5,
                  not_timed_out: 6,
                  total: 6,
                  delay: { counts: [4, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 3, not_timed_out: 4, total: 4 },
                  'alerting:__index-threshold': { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 2, not_timed_out: 3, total: 3 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[12]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 5,
                  not_timed_out: 6,
                  total: 6,
                  delay: { counts: [4, 2, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 3, not_timed_out: 4, total: 4 },
                  'alerting:__index-threshold': { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 2, not_timed_out: 3, total: 3 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[13]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 6,
                  not_timed_out: 7,
                  total: 7,
                  delay: { counts: [4, 2, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 4, not_timed_out: 5, total: 5 },
                  'alerting:__index-threshold': { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 3, not_timed_out: 4, total: 4 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[14]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 6,
                  not_timed_out: 7,
                  total: 7,
                  delay: { counts: [5, 2, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 4, not_timed_out: 5, total: 5 },
                  'alerting:__index-threshold': { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 3, not_timed_out: 4, total: 4 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[15]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 6,
                  not_timed_out: 8,
                  total: 8,
                  delay: { counts: [5, 2, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 4, not_timed_out: 6, total: 6 },
                  'alerting:__index-threshold': { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 3, not_timed_out: 5, total: 5 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[16]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 6,
                  not_timed_out: 8,
                  total: 8,
                  delay: { counts: [6, 2, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 4, not_timed_out: 6, total: 6 },
                  'alerting:__index-threshold': { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 3, not_timed_out: 5, total: 5 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[17]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 7,
                  not_timed_out: 9,
                  total: 9,
                  delay: { counts: [6, 2, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 5, not_timed_out: 7, total: 7 },
                  'alerting:__index-threshold': { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 4, not_timed_out: 6, total: 6 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[18]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 7,
                  not_timed_out: 9,
                  total: 9,
                  delay: { counts: [7, 2, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 5, not_timed_out: 7, total: 7 },
                  'alerting:__index-threshold': { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 4, not_timed_out: 6, total: 6 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[19]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 7,
                  not_timed_out: 10,
                  total: 10,
                  delay: { counts: [7, 2, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  actions: { success: 0, not_timed_out: 1, total: 1 },
                  alerting: { success: 5, not_timed_out: 7, total: 7 },
                  'actions:webhook': { success: 0, not_timed_out: 1, total: 1 },
                  'alerting:__index-threshold': { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 4, not_timed_out: 6, total: 6 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
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
      const reset$ = new Subject<boolean>();
      const taskRunEvents1 = [
        getTaskManagerStatEvent(3.234),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(10.45),
        getTaskRunSuccessEvent('telemetry'),
        getTaskManagerStatEvent(3.454),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(35.45),
        getTaskRunSuccessEvent('report'),
        getTaskManagerStatEvent(8.85673),
        getTaskRunFailedEvent('alerting:example'),
      ];

      const taskRunEvents2 = [
        getTaskManagerStatEvent(4.5745),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(11.564),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(3.78),
        getTaskRunFailedEvent('alerting:example'),
        getTaskManagerStatEvent(3.7863),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(3.245),
        getTaskRunFailedEvent('actions:webhook'),
      ];
      const events$ = new Subject<TaskLifecycleEvent>();

      const taskRunAggregator = createAggregator({
        key: 'task_run',
        events$,
        config,
        reset$,
        eventFilter: (event: TaskLifecycleEvent) =>
          isTaskRunEvent(event) || isTaskManagerStatEvent(event),
        metricsAggregator: new TaskRunMetricsAggregator(),
      });

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
                overall: {
                  success: 0,
                  not_timed_out: 0,
                  total: 0,
                  delay: { counts: [1], values: [10] },
                },
              },
            });
            expect(metrics[1]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 1,
                  not_timed_out: 1,
                  total: 1,
                  delay: { counts: [1], values: [10] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[2]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 1,
                  not_timed_out: 1,
                  total: 1,
                  delay: { counts: [1, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[3]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 2,
                  total: 2,
                  delay: { counts: [1, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[4]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 2,
                  total: 2,
                  delay: { counts: [2, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[5]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 3,
                  total: 3,
                  delay: { counts: [2, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[6]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 3,
                  total: 3,
                  delay: { counts: [2, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[7]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 4,
                  not_timed_out: 4,
                  total: 4,
                  delay: { counts: [2, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[8]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 4,
                  not_timed_out: 4,
                  total: 4,
                  delay: { counts: [3, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[9]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 4,
                  not_timed_out: 5,
                  total: 5,
                  delay: { counts: [3, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 3, total: 3 },
                  'alerting:example': { success: 2, not_timed_out: 3, total: 3 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            // reset event should have been received here
            expect(metrics[10]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 0,
                  not_timed_out: 0,
                  total: 0,
                  delay: { counts: [1], values: [10] },
                },
                by_type: {
                  alerting: { success: 0, not_timed_out: 0, total: 0 },
                  'alerting:example': { success: 0, not_timed_out: 0, total: 0 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[11]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 1,
                  not_timed_out: 1,
                  total: 1,
                  delay: { counts: [1], values: [10] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[12]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 1,
                  not_timed_out: 1,
                  total: 1,
                  delay: { counts: [1, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[13]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 2,
                  total: 2,
                  delay: { counts: [1, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[14]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 2,
                  total: 2,
                  delay: { counts: [2, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[15]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 3,
                  total: 3,
                  delay: { counts: [2, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 3, total: 3 },
                  'alerting:example': { success: 2, not_timed_out: 3, total: 3 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[16]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 3,
                  total: 3,
                  delay: { counts: [3, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 3, total: 3 },
                  'alerting:example': { success: 2, not_timed_out: 3, total: 3 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[17]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 4,
                  total: 4,
                  delay: { counts: [3, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 3, not_timed_out: 4, total: 4 },
                  'alerting:example': { success: 3, not_timed_out: 4, total: 4 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[18]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 4,
                  total: 4,
                  delay: { counts: [4, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 3, not_timed_out: 4, total: 4 },
                  'alerting:example': { success: 3, not_timed_out: 4, total: 4 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[19]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 5,
                  total: 5,
                  delay: { counts: [4, 1], values: [10, 20] },
                },
                by_type: {
                  actions: { success: 0, not_timed_out: 1, total: 1 },
                  alerting: { success: 3, not_timed_out: 4, total: 4 },
                  'actions:webhook': { success: 0, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 3, not_timed_out: 4, total: 4 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            resolve();
          });

        for (const event of taskRunEvents1) {
          events$.next(event);
        }
        reset$.next(true);
        for (const event of taskRunEvents2) {
          events$.next(event);
        }
      });
    });

    test('resets count when configured metrics reset interval expires', async () => {
      const clock = sinon.useFakeTimers();
      clock.tick(0);
      const taskRunEvents1 = [
        getTaskManagerStatEvent(3.234),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(10.45),
        getTaskRunSuccessEvent('telemetry'),
        getTaskManagerStatEvent(3.454),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(35.45),
        getTaskRunSuccessEvent('report'),
        getTaskManagerStatEvent(8.85673),
        getTaskRunFailedEvent('alerting:example'),
      ];

      const taskRunEvents2 = [
        getTaskManagerStatEvent(4.5745),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(11.564),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(3.78),
        getTaskRunFailedEvent('alerting:example'),
        getTaskManagerStatEvent(3.7863),
        getTaskRunSuccessEvent('alerting:example'),
        getTaskManagerStatEvent(3.245),
        getTaskRunFailedEvent('actions:webhook'),
      ];
      const events$ = new Subject<TaskLifecycleEvent>();

      const taskRunAggregator = createAggregator({
        key: 'task_run',
        events$,
        config: {
          ...config,
          metrics_reset_interval: 10,
        },
        reset$: new Subject<boolean>(),
        eventFilter: (event: TaskLifecycleEvent) =>
          isTaskRunEvent(event) || isTaskManagerStatEvent(event),
        metricsAggregator: new TaskRunMetricsAggregator(),
      });

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
                overall: {
                  success: 0,
                  not_timed_out: 0,
                  total: 0,
                  delay: { counts: [1], values: [10] },
                },
              },
            });
            expect(metrics[1]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 1,
                  not_timed_out: 1,
                  total: 1,
                  delay: { counts: [1], values: [10] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[2]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 1,
                  not_timed_out: 1,
                  total: 1,
                  delay: { counts: [1, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[3]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 2,
                  total: 2,
                  delay: { counts: [1, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[4]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 2,
                  total: 2,
                  delay: { counts: [2, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[5]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 3,
                  total: 3,
                  delay: { counts: [2, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[6]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 3,
                  total: 3,
                  delay: { counts: [2, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[7]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 4,
                  not_timed_out: 4,
                  total: 4,
                  delay: { counts: [2, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[8]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 4,
                  not_timed_out: 4,
                  total: 4,
                  delay: { counts: [3, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            expect(metrics[9]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 4,
                  not_timed_out: 5,
                  total: 5,
                  delay: { counts: [3, 1, 0, 1], values: [10, 20, 30, 40] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 3, total: 3 },
                  'alerting:example': { success: 2, not_timed_out: 3, total: 3 },
                  report: { success: 1, not_timed_out: 1, total: 1 },
                  telemetry: { success: 1, not_timed_out: 1, total: 1 },
                },
              },
            });
            // reset event should have been received here
            expect(metrics[10]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 0,
                  not_timed_out: 0,
                  total: 0,
                  delay: { counts: [1], values: [10] },
                },
                by_type: {
                  alerting: { success: 0, not_timed_out: 0, total: 0 },
                  'alerting:example': { success: 0, not_timed_out: 0, total: 0 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[11]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 1,
                  not_timed_out: 1,
                  total: 1,
                  delay: { counts: [1], values: [10] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[12]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 1,
                  not_timed_out: 1,
                  total: 1,
                  delay: { counts: [1, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 1, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 1, not_timed_out: 1, total: 1 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[13]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 2,
                  total: 2,
                  delay: { counts: [1, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[14]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 2,
                  total: 2,
                  delay: { counts: [2, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 2, total: 2 },
                  'alerting:example': { success: 2, not_timed_out: 2, total: 2 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[15]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 3,
                  total: 3,
                  delay: { counts: [2, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 3, total: 3 },
                  'alerting:example': { success: 2, not_timed_out: 3, total: 3 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[16]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 2,
                  not_timed_out: 3,
                  total: 3,
                  delay: { counts: [3, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 2, not_timed_out: 3, total: 3 },
                  'alerting:example': { success: 2, not_timed_out: 3, total: 3 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[17]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 4,
                  total: 4,
                  delay: { counts: [3, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 3, not_timed_out: 4, total: 4 },
                  'alerting:example': { success: 3, not_timed_out: 4, total: 4 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[18]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 4,
                  total: 4,
                  delay: { counts: [4, 1], values: [10, 20] },
                },
                by_type: {
                  alerting: { success: 3, not_timed_out: 4, total: 4 },
                  'alerting:example': { success: 3, not_timed_out: 4, total: 4 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
                },
              },
            });
            expect(metrics[19]).toEqual({
              key: 'task_run',
              value: {
                overall: {
                  success: 3,
                  not_timed_out: 5,
                  total: 5,
                  delay: { counts: [4, 1], values: [10, 20] },
                },
                by_type: {
                  actions: { success: 0, not_timed_out: 1, total: 1 },
                  alerting: { success: 3, not_timed_out: 4, total: 4 },
                  'actions:webhook': { success: 0, not_timed_out: 1, total: 1 },
                  'alerting:example': { success: 3, not_timed_out: 4, total: 4 },
                  report: { success: 0, not_timed_out: 0, total: 0 },
                  telemetry: { success: 0, not_timed_out: 0, total: 0 },
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

  describe('with TaskOverdueMetricsAggregator', () => {
    test('returns latest values for task overdue by time', async () => {
      const events = [
        getTaskManagerMetricEvent({
          numOverdueTasks: {
            'alerting:example': [{ key: 40, doc_count: 1 }],
            'alerting:.index-threshold': [
              { key: 20, doc_count: 2 },
              { key: 120, doc_count: 1 },
            ],
            'actions:webhook': [{ key: 0, doc_count: 2 }],
            'actions:.email': [{ key: 0, doc_count: 1 }],
            total: [
              { key: 0, doc_count: 3 },
              { key: 20, doc_count: 2 },
              { key: 40, doc_count: 1 },
              { key: 120, doc_count: 1 },
            ],
          },
        }),
        getTaskManagerMetricEvent({
          numOverdueTasks: {
            total: [],
          },
        }),
        getTaskManagerMetricEvent({
          numOverdueTasks: {
            telemetry: [
              { key: 0, doc_count: 1 },
              { key: 20, doc_count: 1 },
            ],
            reporting: [{ key: 0, doc_count: 1 }],
            'actions:webhook': [
              { key: 0, doc_count: 3 },
              { key: 30, doc_count: 2 },
              { key: 50, doc_count: 1 },
            ],
            'actions:.email': [{ key: 0, doc_count: 11 }],
            total: [
              { key: 0, doc_count: 16 },
              { key: 20, doc_count: 1 },
              { key: 30, doc_count: 2 },
              { key: 50, doc_count: 1 },
            ],
          },
        }),
      ];
      const events$ = new Subject<TaskLifecycleEvent>();

      const taskOverdueAggregator = createAggregator({
        key: 'task_overdue',
        events$,
        config,
        reset$: new Subject<boolean>(),
        eventFilter: (event: TaskLifecycleEvent) => isTaskManagerMetricEvent(event),
        metricsAggregator: new TaskOverdueMetricsAggregator(),
      });

      return new Promise<void>((resolve) => {
        taskOverdueAggregator
          .pipe(
            // skip initial metric which is just initialized data which
            // ensures we don't stall on combineLatest
            skip(1),
            take(events.length),
            bufferCount(events.length)
          )
          .subscribe((metrics: Array<AggregatedStat<TaskOverdueMetric>>) => {
            expect(metrics[0]).toEqual({
              key: 'task_overdue',
              value: {
                overall: {
                  overdue_by: {
                    counts: [3, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
                    values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130],
                  },
                },
                by_type: {
                  'alerting:example': {
                    overdue_by: {
                      counts: [0, 0, 0, 0, 1],
                      values: [10, 20, 30, 40, 50],
                    },
                  },
                  'alerting:__index-threshold': {
                    overdue_by: {
                      counts: [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                      values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130],
                    },
                  },
                  alerting: {
                    overdue_by: {
                      counts: [0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
                      values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130],
                    },
                  },
                  'actions:webhook': {
                    overdue_by: {
                      counts: [2],
                      values: [10],
                    },
                  },
                  'actions:__email': {
                    overdue_by: {
                      counts: [1],
                      values: [10],
                    },
                  },
                  actions: {
                    overdue_by: {
                      counts: [3],
                      values: [10],
                    },
                  },
                },
              },
            });
            expect(metrics[1]).toEqual({
              key: 'task_overdue',
              value: {
                overall: { overdue_by: { counts: [], values: [] } },
                by_type: {},
              },
            });
            expect(metrics[2]).toEqual({
              key: 'task_overdue',
              value: {
                overall: {
                  overdue_by: {
                    counts: [16, 0, 1, 2, 0, 1],
                    values: [10, 20, 30, 40, 50, 60],
                  },
                },
                by_type: {
                  telemetry: {
                    overdue_by: {
                      counts: [1, 0, 1],
                      values: [10, 20, 30],
                    },
                  },
                  reporting: {
                    overdue_by: {
                      counts: [1],
                      values: [10],
                    },
                  },
                  'actions:webhook': {
                    overdue_by: {
                      counts: [3, 0, 0, 2, 0, 1],
                      values: [10, 20, 30, 40, 50, 60],
                    },
                  },
                  'actions:__email': {
                    overdue_by: {
                      counts: [11],
                      values: [10],
                    },
                  },
                  actions: {
                    overdue_by: {
                      counts: [14, 0, 0, 2, 0, 1],
                      values: [10, 20, 30, 40, 50, 60],
                    },
                  },
                },
              },
            });
            resolve();
          });

        for (const event of events) {
          events$.next(event);
        }
      });
    });
  });

  test('should filter task lifecycle events using specified eventFilter', () => {
    const events = [
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimFailureEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimFailureEvent,
      taskClaimSuccessEvent,
    ];
    const eventFilter = jest.fn().mockReturnValue(true);
    const events$ = new Subject<TaskLifecycleEvent>();

    const aggregator = createAggregator({
      key: 'test',
      events$,
      config,
      reset$: new Subject<boolean>(),
      eventFilter,
      metricsAggregator: new TaskClaimMetricsAggregator(),
    });

    return new Promise<void>((resolve) => {
      aggregator
        .pipe(
          // skip initial metric which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          take(events.length),
          bufferCount(events.length)
        )
        .subscribe(() => {
          resolve();
        });

      for (const event of events) {
        events$.next(event);
      }

      expect(eventFilter).toHaveBeenCalledTimes(events.length);
    });
  });

  test('should call metricAggregator to process events', () => {
    const spy = jest
      .spyOn(TaskClaimMetricsAggregatorModule, 'TaskClaimMetricsAggregator')
      .mockImplementation(() => mockMetricsAggregator);

    const events = [
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimFailureEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimFailureEvent,
      taskClaimSuccessEvent,
    ];
    const eventFilter = jest.fn().mockReturnValue(true);
    const events$ = new Subject<TaskLifecycleEvent>();

    const aggregator = createAggregator({
      key: 'test',
      events$,
      config,
      reset$: new Subject<boolean>(),
      eventFilter,
      metricsAggregator: new TaskClaimMetricsAggregator(),
    });

    return new Promise<void>((resolve) => {
      aggregator
        .pipe(
          // skip initial metric which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          take(events.length),
          bufferCount(events.length)
        )
        .subscribe(() => {
          resolve();
        });

      for (const event of events) {
        events$.next(event);
      }

      expect(mockMetricsAggregator.initialMetric).toHaveBeenCalledTimes(1);
      expect(mockMetricsAggregator.processEvent).toHaveBeenCalledTimes(events.length);
      expect(mockMetricsAggregator.collect).toHaveBeenCalledTimes(events.length);
      expect(mockMetricsAggregator.reset).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  test('should call metricAggregator reset when resetMetric$ event is received', () => {
    const spy = jest
      .spyOn(TaskClaimMetricsAggregatorModule, 'TaskClaimMetricsAggregator')
      .mockImplementation(() => mockMetricsAggregator);

    const reset$ = new Subject<boolean>();
    const events = [
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimFailureEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimSuccessEvent,
      taskClaimFailureEvent,
      taskClaimSuccessEvent,
    ];
    const eventFilter = jest.fn().mockReturnValue(true);
    const events$ = new Subject<TaskLifecycleEvent>();

    const aggregator = createAggregator({
      key: 'test',
      events$,
      config,
      reset$,
      eventFilter,
      metricsAggregator: mockMetricsAggregator,
    });

    return new Promise<void>((resolve) => {
      aggregator
        .pipe(
          // skip initial metric which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          take(events.length),
          bufferCount(events.length)
        )
        .subscribe(() => {
          resolve();
        });

      for (const event of events) {
        events$.next(event);
      }

      for (let i = 0; i < 5; i++) {
        events$.next(events[i]);
      }
      reset$.next(true);
      for (let i = 0; i < events.length; i++) {
        events$.next(events[i]);
      }

      expect(mockMetricsAggregator.initialMetric).toHaveBeenCalledTimes(1);
      expect(mockMetricsAggregator.processEvent).toHaveBeenCalledTimes(events.length);
      expect(mockMetricsAggregator.collect).toHaveBeenCalledTimes(events.length);
      expect(mockMetricsAggregator.reset).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });
});
