/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { Observable, of, Subject, throwError } from 'rxjs';
import { first, catchError } from 'rxjs/operators';

import { TaskPollingLifecycle, claimAvailableTasks } from './polling_lifecycle';
import { createInitialMiddleware } from './lib/middleware';
import { TaskTypeDictionary } from './task_type_dictionary';
import { taskStoreMock } from './task_store.mock';
import { mockLogger } from './test_utils';
import { taskClaimingMock } from './queries/task_claiming.mock';
import { ClaimOwnershipResult } from './queries/task_claiming';
import { TaskPoolRunResult } from './task_pool';
import { Err, isErr, isOk } from './lib/result_type';
import { FillPoolResult } from './lib/fill_pool';

describe('TaskPollingLifecycle', () => {
  let clock: sinon.SinonFakeTimers;

  const taskManagerLogger = mockLogger();
  const mockTaskStore = taskStoreMock.create({});
  const mockTaskClaiming = taskClaimingMock.create({});
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
      monitored_stats_required_freshness: 5000,
      monitored_stats_running_average_window: 50,
      monitored_task_execution_thresholds: {
        default: {
          error_threshold: 90,
          warn_threshold: 80,
        },
        custom: {},
      },
    },
    taskStore: mockTaskStore,
    taskClaiming: mockTaskClaiming,
    logger: taskManagerLogger,
    definitions: new TaskTypeDictionary(taskManagerLogger),
    middleware: createInitialMiddleware(),
    maxWorkersConfiguration$: of(100),
    pollIntervalConfiguration$: of(100),
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    taskManagerOpts.definitions = new TaskTypeDictionary(taskManagerLogger);
  });

  afterEach(() => clock.restore());

  describe('start', () => {
    test('begins polling once the ES and SavedObjects services are available', () => {
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      new TaskPollingLifecycle({
        elasticsearchAndSOAvailability$,
        ...taskManagerOpts,
      });

      clock.tick(150);
      expect(mockTaskClaiming.claimAvailableTasks).not.toHaveBeenCalled();

      elasticsearchAndSOAvailability$.next(true);

      clock.tick(150);
      expect(mockTaskClaiming.claimAvailableTasks).toHaveBeenCalled();
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
      expect(mockTaskClaiming.claimAvailableTasks).toHaveBeenCalled();

      elasticsearchAndSOAvailability$.next(false);

      mockTaskClaiming.claimAvailableTasks.mockClear();
      clock.tick(150);
      expect(mockTaskClaiming.claimAvailableTasks).not.toHaveBeenCalled();
    });

    test('restarts polling once the ES and SavedObjects services become available again', () => {
      const elasticsearchAndSOAvailability$ = new Subject<boolean>();
      new TaskPollingLifecycle({
        elasticsearchAndSOAvailability$,
        ...taskManagerOpts,
      });

      elasticsearchAndSOAvailability$.next(true);

      clock.tick(150);
      expect(mockTaskClaiming.claimAvailableTasks).toHaveBeenCalled();

      elasticsearchAndSOAvailability$.next(false);
      mockTaskClaiming.claimAvailableTasks.mockClear();
      clock.tick(150);

      expect(mockTaskClaiming.claimAvailableTasks).not.toHaveBeenCalled();

      elasticsearchAndSOAvailability$.next(true);
      clock.tick(150);

      expect(mockTaskClaiming.claimAvailableTasks).toHaveBeenCalled();
    });
  });

  describe('claimAvailableTasks', () => {
    test('should claim Available Tasks when there are available workers', async () => {
      const logger = mockLogger();
      const claim = jest.fn(() =>
        of({
          docs: [],
          stats: { tasksUpdated: 0, tasksConflicted: 0, tasksClaimed: 0 },
        })
      );

      const availableWorkers = 1;

      expect(
        isOk(
          await getFirstAsPromise(claimAvailableTasks([], claim, () => availableWorkers, logger))
        )
      ).toBeTruthy();

      expect(claim).toHaveBeenCalledTimes(1);
    });

    test('should not claim Available Tasks when there are no available workers', async () => {
      const logger = mockLogger();
      const claim = jest.fn(() =>
        of({
          docs: [],
          stats: { tasksUpdated: 0, tasksConflicted: 0, tasksClaimed: 0 },
        })
      );

      const availableWorkers = 0;

      const err = await getFirstAsPromise(
        claimAvailableTasks([], claim, () => availableWorkers, logger)
      );

      expect(isErr(err)).toBeTruthy();
      expect((err as Err<FillPoolResult>).error).toEqual(FillPoolResult.NoAvailableWorkers);

      expect(claim).not.toHaveBeenCalled();
    });

    /**
     * This handles the case in which Elasticsearch has had inline script disabled.
     * This is achieved by setting the `script.allowed_types` flag on Elasticsearch to `none`
     */
    test('handles failure due to inline scripts being disabled', async () => {
      const logger = mockLogger();
      const claim = jest.fn(
        () =>
          new Observable<ClaimOwnershipResult>((observer) => {
            observer.error(
              Object.assign(new Error(), {
                response:
                  '{"error":{"root_cause":[{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts"}],"type":"search_phase_execution_exception","reason":"all shards failed","phase":"query","grouped":true,"failed_shards":[{"shard":0,"index":".kibana_task_manager_1","node":"24A4QbjHSK6prvtopAKLKw","reason":{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts"}}],"caused_by":{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts","caused_by":{"type":"illegal_argument_exception","reason":"cannot execute [inline] scripts"}}},"status":400}',
              })
            );
          })
      );

      const err = await getFirstAsPromise(claimAvailableTasks([], claim, () => 10, logger));

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
