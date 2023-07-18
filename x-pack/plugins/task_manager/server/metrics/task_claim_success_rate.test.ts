/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import sinon from 'sinon';
import { Subject, Observable } from 'rxjs';
import { none } from 'fp-ts/lib/Option';
import { take, bufferCount, skip, map } from 'rxjs/operators';
import { asTaskPollingCycleEvent } from '../task_events';
import { asErr, asOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { AggregatedStat } from '../lib/runtime_statistics_aggregator';
import { taskPollingLifecycleMock } from '../polling_lifecycle.mock';
import { createTaskClaimAggregator, TaskClaimSuccessRate } from './task_claim_success_rate';
import { FillPoolResult } from '../lib/fill_pool';
import { PollingError, PollingErrorType } from '../polling';
import { TaskManagerConfig } from '../config';

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

const taskClaimSuccessEvent = asTaskPollingCycleEvent<string>(
  asOk({
    result: FillPoolResult.PoolFilled,
    stats: {
      tasksUpdated: 0,
      tasksConflicted: 0,
      tasksClaimed: 0,
    },
  }),
  {
    start: 1689698780490,
    stop: 1689698780500,
  }
);
const taskClaimFailureEvent = asTaskPollingCycleEvent<string>(
  asErr(
    new PollingError<string>(
      'Failed to poll for work: Error: failed to work',
      PollingErrorType.WorkError,
      none
    )
  )
);

describe('Task Claim Metrics', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  describe('createTaskClaimAggregator', () => {
    test('returns a cumulative count of successful polling cycles and total polling cycles', async () => {
      const pollingCycleEvents = [
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
      const taskPollingLifecycle = taskPollingLifecycleMock.create({
        events$: events$ as Observable<TaskLifecycleEvent>,
      });

      const taskClaimAggregator = createTaskClaimAggregator(
        taskPollingLifecycle,
        configuration,
        new Subject<boolean>()
      );

      return new Promise<void>((resolve) => {
        taskClaimAggregator
          .pipe(
            // skip initial metric which is just initialized data which
            // ensures we don't stall on combineLatest
            skip(1),
            map(({ key, value }: AggregatedStat<TaskClaimSuccessRate>) => ({
              key,
              value,
            })),
            take(pollingCycleEvents.length),
            bufferCount(pollingCycleEvents.length)
          )
          .subscribe((metrics: Array<AggregatedStat<TaskClaimSuccessRate>>) => {
            expect(metrics[0]).toEqual({
              key: 'task_claim_success',
              value: { success: 1, total: 1 },
            });
            expect(metrics[1]).toEqual({
              key: 'task_claim_success',
              value: { success: 2, total: 2 },
            });
            expect(metrics[2]).toEqual({
              key: 'task_claim_success',
              value: { success: 3, total: 3 },
            });
            expect(metrics[3]).toEqual({
              key: 'task_claim_success',
              value: { success: 4, total: 4 },
            });
            expect(metrics[4]).toEqual({
              key: 'task_claim_success',
              value: { success: 4, total: 5 },
            });
            expect(metrics[5]).toEqual({
              key: 'task_claim_success',
              value: { success: 5, total: 6 },
            });
            expect(metrics[6]).toEqual({
              key: 'task_claim_success',
              value: { success: 6, total: 7 },
            });
            expect(metrics[7]).toEqual({
              key: 'task_claim_success',
              value: { success: 7, total: 8 },
            });
            expect(metrics[8]).toEqual({
              key: 'task_claim_success',
              value: { success: 8, total: 9 },
            });
            expect(metrics[9]).toEqual({
              key: 'task_claim_success',
              value: { success: 8, total: 10 },
            });
            expect(metrics[10]).toEqual({
              key: 'task_claim_success',
              value: { success: 9, total: 11 },
            });
            resolve();
          });

        for (const event of pollingCycleEvents) {
          events$.next(event);
        }
      });
    });

    test('resets count when resetMetric$ event is received', async () => {
      const resetMetric$ = new Subject<boolean>();
      const pollingCycleEvents1 = [
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimFailureEvent,
        taskClaimSuccessEvent,
      ];

      const pollingCycleEvents2 = [
        taskClaimSuccessEvent,
        taskClaimFailureEvent,
        taskClaimFailureEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
      ];
      const events$ = new Subject<TaskLifecycleEvent>();
      const taskPollingLifecycle = taskPollingLifecycleMock.create({
        events$: events$ as Observable<TaskLifecycleEvent>,
      });

      const taskClaimAggregator = createTaskClaimAggregator(
        taskPollingLifecycle,
        configuration,
        resetMetric$
      );

      return new Promise<void>((resolve) => {
        taskClaimAggregator
          .pipe(
            // skip initial metric which is just initialized data which
            // ensures we don't stall on combineLatest
            skip(1),
            map(({ key, value }: AggregatedStat<TaskClaimSuccessRate>) => ({
              key,
              value,
            })),
            take(pollingCycleEvents1.length + pollingCycleEvents2.length),
            bufferCount(pollingCycleEvents1.length + pollingCycleEvents2.length)
          )
          .subscribe((metrics: Array<AggregatedStat<TaskClaimSuccessRate>>) => {
            expect(metrics[0]).toEqual({
              key: 'task_claim_success',
              value: { success: 1, total: 1 },
            });
            expect(metrics[1]).toEqual({
              key: 'task_claim_success',
              value: { success: 2, total: 2 },
            });
            expect(metrics[2]).toEqual({
              key: 'task_claim_success',
              value: { success: 3, total: 3 },
            });
            expect(metrics[3]).toEqual({
              key: 'task_claim_success',
              value: { success: 4, total: 4 },
            });
            expect(metrics[4]).toEqual({
              key: 'task_claim_success',
              value: { success: 4, total: 5 },
            });
            expect(metrics[5]).toEqual({
              key: 'task_claim_success',
              value: { success: 5, total: 6 },
            });
            // reset event should have been received here
            expect(metrics[6]).toEqual({
              key: 'task_claim_success',
              value: { success: 1, total: 1 },
            });
            expect(metrics[7]).toEqual({
              key: 'task_claim_success',
              value: { success: 1, total: 2 },
            });
            expect(metrics[8]).toEqual({
              key: 'task_claim_success',
              value: { success: 1, total: 3 },
            });
            expect(metrics[9]).toEqual({
              key: 'task_claim_success',
              value: { success: 2, total: 4 },
            });
            expect(metrics[10]).toEqual({
              key: 'task_claim_success',
              value: { success: 3, total: 5 },
            });
            resolve();
          });

        for (const event of pollingCycleEvents1) {
          events$.next(event);
        }
        resetMetric$.next(true);
        for (const event of pollingCycleEvents2) {
          events$.next(event);
        }
      });
    });

    test('resets count when configured metrics reset interval expires', async () => {
      const clock = sinon.useFakeTimers();
      clock.tick(0);
      const pollingCycleEvents1 = [
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
        taskClaimFailureEvent,
        taskClaimSuccessEvent,
      ];

      const pollingCycleEvents2 = [
        taskClaimSuccessEvent,
        taskClaimFailureEvent,
        taskClaimFailureEvent,
        taskClaimSuccessEvent,
        taskClaimSuccessEvent,
      ];
      const events$ = new Subject<TaskLifecycleEvent>();
      const taskPollingLifecycle = taskPollingLifecycleMock.create({
        events$: events$ as Observable<TaskLifecycleEvent>,
      });

      const taskClaimAggregator = createTaskClaimAggregator(
        taskPollingLifecycle,
        {
          ...configuration,
          metrics_reset_interval: 10,
        },
        new Subject<boolean>()
      );

      return new Promise<void>((resolve) => {
        taskClaimAggregator
          .pipe(
            // skip initial metric which is just initialized data which
            // ensures we don't stall on combineLatest
            skip(1),
            map(({ key, value }: AggregatedStat<TaskClaimSuccessRate>) => ({
              key,
              value,
            })),
            take(pollingCycleEvents1.length + pollingCycleEvents2.length),
            bufferCount(pollingCycleEvents1.length + pollingCycleEvents2.length)
          )
          .subscribe((metrics: Array<AggregatedStat<TaskClaimSuccessRate>>) => {
            expect(metrics[0]).toEqual({
              key: 'task_claim_success',
              value: { success: 1, total: 1 },
            });
            expect(metrics[1]).toEqual({
              key: 'task_claim_success',
              value: { success: 2, total: 2 },
            });
            expect(metrics[2]).toEqual({
              key: 'task_claim_success',
              value: { success: 3, total: 3 },
            });
            expect(metrics[3]).toEqual({
              key: 'task_claim_success',
              value: { success: 4, total: 4 },
            });
            expect(metrics[4]).toEqual({
              key: 'task_claim_success',
              value: { success: 4, total: 5 },
            });
            expect(metrics[5]).toEqual({
              key: 'task_claim_success',
              value: { success: 5, total: 6 },
            });
            // reset interval should have fired here
            expect(metrics[6]).toEqual({
              key: 'task_claim_success',
              value: { success: 1, total: 1 },
            });
            expect(metrics[7]).toEqual({
              key: 'task_claim_success',
              value: { success: 1, total: 2 },
            });
            expect(metrics[8]).toEqual({
              key: 'task_claim_success',
              value: { success: 1, total: 3 },
            });
            expect(metrics[9]).toEqual({
              key: 'task_claim_success',
              value: { success: 2, total: 4 },
            });
            expect(metrics[10]).toEqual({
              key: 'task_claim_success',
              value: { success: 3, total: 5 },
            });
            resolve();
          });

        for (const event of pollingCycleEvents1) {
          events$.next(event);
        }
        clock.tick(20);
        for (const event of pollingCycleEvents2) {
          events$.next(event);
        }

        clock.restore();
      });
    });
  });
});
