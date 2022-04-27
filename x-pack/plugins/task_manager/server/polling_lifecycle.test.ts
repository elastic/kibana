/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { Observable, of, Subject } from 'rxjs';

import { TaskPollingLifecycle, claimAvailableTasks } from './polling_lifecycle';
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

const executionContext = executionContextServiceMock.createSetupContract();
let mockTaskClaiming = taskClaimingMock.create({});
jest.mock('./queries/task_claiming', () => {
  return {
    TaskClaiming: jest.fn().mockImplementation(() => {
      return mockTaskClaiming;
    }),
  };
});

describe('TaskPollingLifecycle', () => {
  let clock: sinon.SinonFakeTimers;
  const taskManagerLogger = mockLogger();
  const mockTaskStore = taskStoreMock.create({});
  const taskManagerOpts = {
    config: {
      enabled: true,
      max_workers: 10,
      index: 'foo',
      max_attempts: 9,
      poll_interval: 6000000,
      version_conflict_threshold: 80,
      max_poll_inactivity_cycles: 10,
      request_capacity: 1000,
      monitored_aggregated_stats_refresh_rate: 5000,
      monitored_stats_health_verbose_log: {
        enabled: false,
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
      },
      event_loop_delay: {
        monitor: true,
        warn_threshold: 5000,
      },
    },
    taskStore: mockTaskStore,
    logger: taskManagerLogger,
    unusedTypes: [],
    definitions: new TaskTypeDictionary(taskManagerLogger),
    middleware: createInitialMiddleware(),
    maxWorkersConfiguration$: of(100),
    pollIntervalConfiguration$: of(100),
    executionContext,
  };

  beforeEach(() => {
    mockTaskClaiming = taskClaimingMock.create({});
    (TaskClaiming as jest.Mock<TaskClaimingClass>).mockClear();
    clock = sinon.useFakeTimers();
  });

  afterEach(() => clock.restore());

  describe('start', () => {
    test('begins polling once the ES and SavedObjects services are available', () => {
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      new TaskPollingLifecycle({
        ...taskManagerOpts,
        elasticsearchAndSOAvailability$,
      });

      clock.tick(150);
      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).not.toHaveBeenCalled();

      elasticsearchAndSOAvailability$.next(true);

      clock.tick(150);
      expect(mockTaskClaiming.claimAvailableTasksIfCapacityIsAvailable).toHaveBeenCalled();
    });

    test('provides TaskClaiming with the capacity available', () => {
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      const maxWorkers$ = new Subject<number>();
      taskManagerOpts.definitions.registerTaskDefinitions({
        report: {
          title: 'report',
          maxConcurrency: 1,
          createTaskRunner: jest.fn(),
        },
        quickReport: {
          title: 'quickReport',
          maxConcurrency: 5,
          createTaskRunner: jest.fn(),
        },
      });

      new TaskPollingLifecycle({
        ...taskManagerOpts,
        elasticsearchAndSOAvailability$,
        maxWorkersConfiguration$: maxWorkers$,
      });

      const taskClaimingGetCapacity = (TaskClaiming as jest.Mock<TaskClaimingClass>).mock
        .calls[0][0].getCapacity;

      maxWorkers$.next(20);
      expect(taskClaimingGetCapacity()).toEqual(20);
      expect(taskClaimingGetCapacity('report')).toEqual(1);
      expect(taskClaimingGetCapacity('quickReport')).toEqual(5);

      maxWorkers$.next(30);
      expect(taskClaimingGetCapacity()).toEqual(30);
      expect(taskClaimingGetCapacity('report')).toEqual(1);
      expect(taskClaimingGetCapacity('quickReport')).toEqual(5);

      maxWorkers$.next(2);
      expect(taskClaimingGetCapacity()).toEqual(2);
      expect(taskClaimingGetCapacity('report')).toEqual(1);
      expect(taskClaimingGetCapacity('quickReport')).toEqual(2);
    });
  });

  describe('stop', () => {
    test('stops polling once the ES and SavedObjects services become unavailable', () => {
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
            stats: { tasksUpdated: 0, tasksConflicted: 0, tasksClaimed: 0, tasksRejected: 0 },
          })
        )
      );

      expect(
        isOk(await getFirstAsPromise(claimAvailableTasks([], taskClaiming, logger)))
      ).toBeTruthy();

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

      const err = await getFirstAsPromise(claimAvailableTasks([], taskClaiming, logger));

      expect(isErr(err)).toBeTruthy();
      expect((err as Err<FillPoolResult>).error).toEqual(FillPoolResult.Failed);

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `Task Manager cannot operate when inline scripts are disabled in Elasticsearch`
      );
    });
  });
});

function getFirstAsPromise<T>(obs$: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs$.subscribe(resolve, reject);
  });
}
