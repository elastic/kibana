/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Subject, of } from 'rxjs';
import { fakeSchedulers } from 'rxjs-marbles/jest';
import { sleep } from '../test_utils';
import { asOk } from '../lib/result_type';
import { delayOnClaimConflicts } from './delay_on_claim_conflicts';
import { asTaskPollingCycleEvent } from '../task_events';
import { bufferCount, take } from 'rxjs/operators';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { FillPoolResult } from '../lib/fill_pool';

describe('delayOnClaimConflicts', () => {
  beforeEach(() => jest.useFakeTimers());

  test(
    'initializes with a delay of 0',
    fakeSchedulers(async () => {
      const pollInterval = 100;
      const maxWorkers = 10;
      const taskLifecycleEvents$ = new Subject<TaskLifecycleEvent>();
      const delays = delayOnClaimConflicts(
        of(maxWorkers),
        of(pollInterval),
        taskLifecycleEvents$,
        80,
        2
      )
        .pipe(take(1), bufferCount(1))
        .toPromise();

      expect(await delays).toEqual([0]);
    })
  );

  test(
    'emits a random delay whenever p50 of claim clashes exceed 80% of available max_workers',
    fakeSchedulers(async () => {
      const pollInterval = 100;
      const maxWorkers = 10;
      const taskLifecycleEvents$ = new Subject<TaskLifecycleEvent>();

      const delays$ = delayOnClaimConflicts(
        of(maxWorkers),
        of(pollInterval),
        taskLifecycleEvents$,
        80,
        2
      )
        .pipe(take(2), bufferCount(2))
        .toPromise<number[]>();

      taskLifecycleEvents$.next(
        asTaskPollingCycleEvent(
          asOk({
            result: FillPoolResult.PoolFilled,
            stats: {
              tasksUpdated: 0,
              tasksConflicted: 8,
              tasksClaimed: 0,
            },
            docs: [],
          })
        )
      );

      const [initialDelay, delayAfterClash] = await delays$;

      expect(initialDelay).toEqual(0);
      // randomly delay by 25% - 75%
      expect(delayAfterClash).toBeGreaterThanOrEqual(pollInterval * 0.25);
      expect(delayAfterClash).toBeLessThanOrEqual(pollInterval * 0.75);
    })
  );

  test(
    'doesnt emit a new delay when conflicts have reduced',
    fakeSchedulers(async () => {
      const pollInterval = 100;
      const maxWorkers = 10;
      const taskLifecycleEvents$ = new Subject<TaskLifecycleEvent>();

      const handler = jest.fn();

      delayOnClaimConflicts(
        of(maxWorkers),
        of(pollInterval),
        taskLifecycleEvents$,
        80,
        2
      ).subscribe(handler);

      await sleep(0);
      expect(handler).toHaveBeenCalledWith(0);

      taskLifecycleEvents$.next(
        asTaskPollingCycleEvent(
          asOk({
            result: FillPoolResult.PoolFilled,
            stats: {
              tasksUpdated: 0,
              tasksConflicted: 8,
              tasksClaimed: 0,
            },
            docs: [],
          })
        )
      );

      await sleep(0);
      expect(handler.mock.calls.length).toEqual(2);
      expect(handler.mock.calls[1][0]).toBeGreaterThanOrEqual(pollInterval * 0.25);
      expect(handler.mock.calls[1][0]).toBeLessThanOrEqual(pollInterval * 0.75);

      // shift average below threshold
      taskLifecycleEvents$.next(
        asTaskPollingCycleEvent(
          asOk({
            result: FillPoolResult.PoolFilled,
            stats: {
              tasksUpdated: 0,
              tasksConflicted: 7,
              tasksClaimed: 0,
            },
            docs: [],
          })
        )
      );

      await sleep(0);
      expect(handler.mock.calls.length).toEqual(2);

      // shift average back up to threshold (7 + 9) / 2 = 80% of maxWorkers
      taskLifecycleEvents$.next(
        asTaskPollingCycleEvent(
          asOk({
            result: FillPoolResult.PoolFilled,
            stats: {
              tasksUpdated: 0,
              tasksConflicted: 9,
              tasksClaimed: 0,
            },
            docs: [],
          })
        )
      );

      await sleep(0);
      expect(handler.mock.calls.length).toEqual(3);
      expect(handler.mock.calls[2][0]).toBeGreaterThanOrEqual(pollInterval * 0.25);
      expect(handler.mock.calls[2][0]).toBeLessThanOrEqual(pollInterval * 0.75);
    })
  );
});
