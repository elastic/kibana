/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { Observable, of, Subject } from 'rxjs';

import { TaskPollingLifecycle, claimAvailableTasks, TaskLifecycleEvent } from './polling_lifecycle';
import { createInitialMiddleware } from './lib/middleware';
import { TaskTypeDictionary } from './task_type_dictionary';
import { taskStoreMock } from './task_store.mock';
import { mockLogger } from './test_utils';
import { taskClaimingMock } from './queries/task_claiming.mock';
import { TaskClaiming, ClaimOwnershipResult } from './queries/task_claiming';
import type { TaskClaiming as TaskClaimingClass } from './queries/task_claiming';
import { asOk, Err, isErr, isOk, Result } from './lib/result_type';
import { FillPoolResult } from './lib/fill_pool';
import { ElasticsearchResponseError } from './lib/identify_es_error';
import { executionContextServiceMock } from '@kbn/core/server/mocks';
import { TaskCost } from './task';
import { CLAIM_STRATEGY_MGET } from './config';
import { TaskPartitioner } from './lib/task_partitioner';
import { KibanaDiscoveryService } from './kibana_discovery_service';

const executionContext = executionContextServiceMock.createSetupContract();
let mockTaskClaiming = taskClaimingMock.create({});
jest.mock('./queries/task_claiming', () => {
  return {
    TaskClaiming: jest.fn().mockImplementation(() => {
      return mockTaskClaiming;
    }),
  };
});

jest.mock('./constants', () => ({
  CONCURRENCY_ALLOW_LIST_BY_TASK_TYPE: ['report', 'quickReport'],
}));

describe('TaskPollingLifecycle', () => {
  let clock: sinon.SinonFakeTimers;
  const taskManagerLogger = mockLogger();
  const mockTaskStore = taskStoreMock.create({});
  const taskManagerOpts = {
    config: {
      enabled: true,
      index: 'foo',
      max_attempts: 9,
      poll_interval: 6000000,
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
        enabled: true,
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
      metrics_reset_interval: 3000,
      claim_strategy: 'default',
      request_timeouts: {
        update_by_query: 1000,
      },
    },
    taskStore: mockTaskStore,
    logger: taskManagerLogger,
    unusedTypes: [],
    definitions: new TaskTypeDictionary(taskManagerLogger),
    middleware: createInitialMiddleware(),
    startingCapacity: 20,
    capacityConfiguration$: of(20),
    pollIntervalConfiguration$: of(100),
    executionContext,
    taskPartitioner: new TaskPartitioner('test', {} as KibanaDiscoveryService),
  };

  beforeEach(() => {
    mockTaskClaiming = taskClaimingMock.create({});
    (TaskClaiming as jest.Mock<TaskClaimingClass>).mockClear();
    clock = sinon.useFakeTimers();
  });

  afterEach(() => clock.restore());

  describe('start', () => {
    taskManagerOpts.definitions.registerTaskDefinitions({
      report: {
        title: 'report',
        maxConcurrency: 1,
        cost: TaskCost.ExtraLarge,
        createTaskRunner: jest.fn(),
      },
      quickReport: {
        title: 'quickReport',
        maxConcurrency: 5,
        createTaskRunner: jest.fn(),
      },
    });

    test('begins polling once the ES and SavedObjects services are available', () => {
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      new TaskPollingLifecycle({ ...taskManagerOpts, elasticsearchAndSOAvailability$ });

      clock.tick(150);
      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).not.toHaveBeenCalled();

      elasticsearchAndSOAvailability$.next(true);

      clock.tick(150);
      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).toHaveBeenCalled();
    });

    test('provides TaskClaiming with the capacity available when strategy = CLAIM_STRATEGY_DEFAULT', () => {
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      const capacity$ = new Subject<number>();

      new TaskPollingLifecycle({
        ...taskManagerOpts,
        elasticsearchAndSOAvailability$,
        capacityConfiguration$: capacity$,
      });

      const taskClaimingGetCapacity = (TaskClaiming as jest.Mock<TaskClaimingClass>).mock
        .calls[0][0].getAvailableCapacity;

      capacity$.next(40);
      expect(taskClaimingGetCapacity()).toEqual(40);
      expect(taskClaimingGetCapacity('report')).toEqual(1);
      expect(taskClaimingGetCapacity('quickReport')).toEqual(5);

      capacity$.next(60);
      expect(taskClaimingGetCapacity()).toEqual(60);
      expect(taskClaimingGetCapacity('report')).toEqual(1);
      expect(taskClaimingGetCapacity('quickReport')).toEqual(5);

      capacity$.next(4);
      expect(taskClaimingGetCapacity()).toEqual(4);
      expect(taskClaimingGetCapacity('report')).toEqual(1);
      expect(taskClaimingGetCapacity('quickReport')).toEqual(4);
    });

    test('provides TaskClaiming with the capacity available when strategy = CLAIM_STRATEGY_MGET', () => {
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      const capacity$ = new Subject<number>();

      new TaskPollingLifecycle({
        ...taskManagerOpts,
        config: { ...taskManagerOpts.config, claim_strategy: CLAIM_STRATEGY_MGET },
        elasticsearchAndSOAvailability$,
        capacityConfiguration$: capacity$,
      });

      const taskClaimingGetCapacity = (TaskClaiming as jest.Mock<TaskClaimingClass>).mock
        .calls[0][0].getAvailableCapacity;

      capacity$.next(40);
      expect(taskClaimingGetCapacity()).toEqual(80);
      expect(taskClaimingGetCapacity('report')).toEqual(10);
      expect(taskClaimingGetCapacity('quickReport')).toEqual(10);

      capacity$.next(60);
      expect(taskClaimingGetCapacity()).toEqual(120);
      expect(taskClaimingGetCapacity('report')).toEqual(10);
      expect(taskClaimingGetCapacity('quickReport')).toEqual(10);

      capacity$.next(4);
      expect(taskClaimingGetCapacity()).toEqual(8);
      expect(taskClaimingGetCapacity('report')).toEqual(8);
      expect(taskClaimingGetCapacity('quickReport')).toEqual(8);
    });
  });

  describe('stop', () => {
    test('stops polling once the ES and SavedObjects services become unavailable', () => {
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      new TaskPollingLifecycle({ elasticsearchAndSOAvailability$, ...taskManagerOpts });

      elasticsearchAndSOAvailability$.next(true);

      clock.tick(150);
      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).toHaveBeenCalled();

      elasticsearchAndSOAvailability$.next(false);

      mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable.mockClear();
      clock.tick(150);
      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).not.toHaveBeenCalled();
    });

    test('restarts polling once the ES and SavedObjects services become available again', () => {
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      new TaskPollingLifecycle({
        elasticsearchAndSOAvailability$,
        ...taskManagerOpts,
      });

      elasticsearchAndSOAvailability$.next(true);

      clock.tick(150);
      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).toHaveBeenCalled();

      elasticsearchAndSOAvailability$.next(false);
      mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable.mockClear();
      clock.tick(150);

      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).not.toHaveBeenCalled();

      elasticsearchAndSOAvailability$.next(true);
      clock.tick(150);

      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).toHaveBeenCalled();
    });
  });

  describe('claimAvailableTasks', () => {
    test('should claim Available Tasks when there are available workers', async () => {
      const logger = mockLogger();
      const taskClaiming = taskClaimingMock.create({});
      taskClaiming.claimAvailableTasksIfCapacityIsAvailable.mockImplementation(() =>
        of(
          asOk({
            docs: [],
            stats: { tasksUpdated: 0, tasksConflicted: 0, tasksClaimed: 0 },
          })
        )
      );

      expect(isOk(await getFirstAsPromise(claimAvailableTasks(taskClaiming, logger)))).toBeTruthy();

      expect(taskClaiming.claimAvailableTasksIfCapacityIsAvailable).toHaveBeenCalledTimes(1);
    });

    /**
     * This handles the case in which Elasticsearch has had inline script disabled.
     * This is achieved by setting the `script.allowed_types` flag on Elasticsearch to `none`
     */
    test('handles failure due to inline scripts being disabled', async () => {
      const logger = mockLogger();
      const taskClaiming = taskClaimingMock.create({});
      taskClaiming.claimAvailableTasksIfCapacityIsAvailable.mockImplementation(
        () =>
          new Observable<Result<ClaimOwnershipResult, FillPoolResult>>((observer) => {
            observer.error({
              name: 'ResponseError',
              meta: {
                body: {
                  error: {
                    root_cause: [
                      {
                        type: 'illegal_argument_exception',
                        reason: 'cannot execute [inline] scripts',
                      },
                    ],
                    type: 'search_phase_execution_exception',
                    reason: 'all shards failed',
                    phase: 'query',
                    grouped: true,
                    failed_shards: [
                      {
                        shard: 0,
                        index: '.kibana_task_manager_1',
                        node: '24A4QbjHSK6prvtopAKLKw',
                        reason: {
                          type: 'illegal_argument_exception',
                          reason: 'cannot execute [inline] scripts',
                        },
                      },
                    ],
                    caused_by: {
                      type: 'illegal_argument_exception',
                      reason: 'cannot execute [inline] scripts',
                      caused_by: {
                        type: 'illegal_argument_exception',
                        reason: 'cannot execute [inline] scripts',
                      },
                    },
                  },
                  status: 400,
                },
              },
              statusCode: 400,
            } as ElasticsearchResponseError);
          })
      );

      const err = await getFirstAsPromise(claimAvailableTasks(taskClaiming, logger));

      expect(isErr(err)).toBeTruthy();
      expect((err as Err<FillPoolResult>).error).toEqual(FillPoolResult.Failed);

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `Task Manager cannot operate when inline scripts are disabled in Elasticsearch`
      );
    });
  });

  describe('workerUtilization events', () => {
    test('should emit event when polling is successful', async () => {
      clock.restore();
      mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable.mockImplementation(() =>
        of(
          asOk({
            docs: [],
            stats: { tasksUpdated: 0, tasksConflicted: 0, tasksClaimed: 0 },
          })
        )
      );
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      const taskPollingLifecycle = new TaskPollingLifecycle({
        ...taskManagerOpts,
        elasticsearchAndSOAvailability$,
      });

      const emittedEvents: TaskLifecycleEvent[] = [];

      taskPollingLifecycle.events.subscribe((event: TaskLifecycleEvent) =>
        emittedEvents.push(event)
      );

      elasticsearchAndSOAvailability$.next(true);
      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).toHaveBeenCalled();
      await retryUntil('workerUtilizationEvent emitted', () => {
        return !!emittedEvents.find(
          (event: TaskLifecycleEvent) => event.id === 'workerUtilization'
        );
      });

      const workerUtilizationEvent = emittedEvents.find(
        (event: TaskLifecycleEvent) => event.id === 'workerUtilization'
      );
      expect(workerUtilizationEvent).toEqual({
        id: 'workerUtilization',
        type: 'TASK_MANAGER_STAT',
        event: { tag: 'ok', value: 0 },
      });
    });

    test('should set utilization to max when capacity is not fully reached but there are tasks left unclaimed', async () => {
      clock.restore();
      mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable.mockImplementation(() =>
        of(
          asOk({
            docs: [],
            stats: { tasksUpdated: 0, tasksConflicted: 0, tasksClaimed: 0, tasksLeftUnclaimed: 2 },
          })
        )
      );
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      const taskPollingLifecycle = new TaskPollingLifecycle({
        ...taskManagerOpts,
        elasticsearchAndSOAvailability$,
      });

      const emittedEvents: TaskLifecycleEvent[] = [];

      taskPollingLifecycle.events.subscribe((event: TaskLifecycleEvent) =>
        emittedEvents.push(event)
      );

      elasticsearchAndSOAvailability$.next(true);
      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).toHaveBeenCalled();
      await retryUntil('workerUtilizationEvent emitted', () => {
        return !!emittedEvents.find(
          (event: TaskLifecycleEvent) => event.id === 'workerUtilization'
        );
      });

      const workerUtilizationEvent = emittedEvents.find(
        (event: TaskLifecycleEvent) => event.id === 'workerUtilization'
      );
      expect(workerUtilizationEvent).toEqual({
        id: 'workerUtilization',
        type: 'TASK_MANAGER_STAT',
        event: { tag: 'ok', value: 100 },
      });
    });

    test('should emit event when polling error occurs', async () => {
      clock.restore();
      mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable.mockImplementation(() => {
        throw new Error('booo');
      });
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      const taskPollingLifecycle = new TaskPollingLifecycle({
        ...taskManagerOpts,
        elasticsearchAndSOAvailability$,
      });

      const emittedEvents: TaskLifecycleEvent[] = [];

      taskPollingLifecycle.events.subscribe((event: TaskLifecycleEvent) =>
        emittedEvents.push(event)
      );

      elasticsearchAndSOAvailability$.next(true);
      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).toHaveBeenCalled();
      await retryUntil('workerUtilizationEvent emitted', () => {
        return !!emittedEvents.find(
          (event: TaskLifecycleEvent) => event.id === 'workerUtilization'
        );
      });
    });
  });
});

function getFirstAsPromise<T>(obs$: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs$.subscribe(resolve, reject);
  });
}

type RetryableFunction = () => boolean;

const RETRY_UNTIL_DEFAULT_COUNT = 20;
const RETRY_UNTIL_DEFAULT_WAIT = 1000; // milliseconds

async function retryUntil(
  label: string,
  fn: RetryableFunction,
  count: number = RETRY_UNTIL_DEFAULT_COUNT,
  wait: number = RETRY_UNTIL_DEFAULT_WAIT
): Promise<boolean> {
  while (count > 0) {
    count--;

    if (fn()) return true;

    // eslint-disable-next-line no-console
    console.log(`attempt failed waiting for "${label}", attempts left: ${count}`);

    if (count === 0) return false;
    await delay(wait);
  }

  return false;
}

async function delay(millis: number) {
  await new Promise((resolve) => setTimeout(resolve, millis));
}
