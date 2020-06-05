/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Subject } from 'rxjs';
import { Option, none, some } from 'fp-ts/lib/Option';
import { createTaskPoller, PollingError, PollingErrorType } from './task_poller';
import { fakeSchedulers } from 'rxjs-marbles/jest';
import { sleep, resolvable } from './test_utils';
import { asOk, asErr } from './lib/result_type';

describe('TaskPoller', () => {
  beforeEach(() => jest.useFakeTimers());

  test(
    'intializes the poller with the provided interval',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;
      const bufferCapacity = 5;
      const halfInterval = Math.floor(pollInterval / 2);

      const work = jest.fn(async () => true);
      createTaskPoller<void, boolean>({
        pollInterval,
        bufferCapacity,
        getCapacity: () => 1,
        work,
        pollRequests$: new Subject<Option<void>>(),
      }).subscribe(() => {});

      // `work` is async, we have to force a node `tick`
      await sleep(0);
      advance(halfInterval);
      expect(work).toHaveBeenCalledTimes(0);
      advance(halfInterval);

      await sleep(0);
      expect(work).toHaveBeenCalledTimes(1);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);
    })
  );

  test(
    'filters interval polling on capacity',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;
      const bufferCapacity = 2;

      const work = jest.fn(async () => true);

      let hasCapacity = true;
      createTaskPoller<void, boolean>({
        pollInterval,
        bufferCapacity,
        work,
        getCapacity: () => (hasCapacity ? 1 : 0),
        pollRequests$: new Subject<Option<void>>(),
      }).subscribe(() => {});

      expect(work).toHaveBeenCalledTimes(0);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(1);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);

      hasCapacity = false;

      await sleep(0);
      advance(pollInterval);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);

      hasCapacity = true;

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(3);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(4);
    })
  );

  test(
    'requests with no arguments (nudge requests) are queued on-demand in between intervals',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;
      const bufferCapacity = 2;
      const querterInterval = Math.floor(pollInterval / 4);
      const halfInterval = querterInterval * 2;

      const work = jest.fn(async () => true);
      const pollRequests$ = new Subject<Option<void>>();
      createTaskPoller<void, boolean>({
        pollInterval,
        bufferCapacity,
        work,
        getCapacity: () => 1,
        pollRequests$,
      }).subscribe(jest.fn());

      expect(work).toHaveBeenCalledTimes(0);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(1);

      advance(querterInterval);
      await sleep(0);
      expect(work).toHaveBeenCalledTimes(1);

      pollRequests$.next(none);

      expect(work).toHaveBeenCalledTimes(2);
      expect(work).toHaveBeenNthCalledWith(2);

      await sleep(0);
      advance(querterInterval);
      expect(work).toHaveBeenCalledTimes(2);

      await sleep(0);
      advance(halfInterval);
      expect(work).toHaveBeenCalledTimes(3);
    })
  );

  test(
    'requests with no arguments (nudge requests) are dropped when there is no capacity',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;
      const bufferCapacity = 2;
      const querterInterval = Math.floor(pollInterval / 4);
      const halfInterval = querterInterval * 2;

      let hasCapacity = true;
      const work = jest.fn(async () => true);
      const pollRequests$ = new Subject<Option<void>>();
      createTaskPoller<void, boolean>({
        pollInterval,
        bufferCapacity,
        work,
        getCapacity: () => (hasCapacity ? 1 : 0),
        pollRequests$,
      }).subscribe(() => {});

      expect(work).toHaveBeenCalledTimes(0);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(1);
      hasCapacity = false;

      await sleep(0);
      advance(querterInterval);

      pollRequests$.next(none);

      expect(work).toHaveBeenCalledTimes(1);

      await sleep(0);
      advance(querterInterval);

      hasCapacity = true;
      advance(halfInterval);
      expect(work).toHaveBeenCalledTimes(2);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(3);
    })
  );

  test(
    'requests with arguments are emitted',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;
      const bufferCapacity = 2;

      const work = jest.fn(async () => true);
      const pollRequests$ = new Subject<Option<string>>();
      createTaskPoller<string, boolean>({
        pollInterval,
        bufferCapacity,
        work,
        getCapacity: () => 1,
        pollRequests$,
      }).subscribe(() => {});

      advance(pollInterval);

      pollRequests$.next(some('one'));

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledWith('one');

      pollRequests$.next(some('two'));

      await sleep(0);
      advance(pollInterval);

      expect(work).toHaveBeenCalledWith('two');
    })
  );

  test(
    'waits for work to complete before emitting the next event',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;
      const bufferCapacity = 2;

      const worker = resolvable();

      const handler = jest.fn();
      const pollRequests$ = new Subject<Option<string>>();
      createTaskPoller<string, string[]>({
        pollInterval,
        bufferCapacity,
        work: async (...args) => {
          await worker;
          return args;
        },
        getCapacity: () => 5,
        pollRequests$,
      }).subscribe(handler);

      pollRequests$.next(some('one'));

      advance(pollInterval);

      // work should now be in progress
      pollRequests$.next(none);
      pollRequests$.next(some('two'));
      pollRequests$.next(some('three'));

      advance(pollInterval);
      await sleep(pollInterval);

      expect(handler).toHaveBeenCalledTimes(0);

      worker.resolve();

      advance(pollInterval);
      await sleep(pollInterval);

      expect(handler).toHaveBeenCalledWith(asOk(['one']));

      advance(pollInterval);

      expect(handler).toHaveBeenCalledWith(asOk(['two', 'three']));
    })
  );

  test(
    'returns an error when polling for work fails',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;
      const bufferCapacity = 2;

      const handler = jest.fn();
      const pollRequests$ = new Subject<Option<string>>();
      createTaskPoller<string, string[]>({
        pollInterval,
        bufferCapacity,
        work: async (...args) => {
          throw new Error('failed to work');
        },
        getCapacity: () => 5,
        pollRequests$,
      }).subscribe(handler);

      advance(pollInterval);
      await sleep(0);

      const expectedError = new PollingError<string>(
        'Failed to poll for work: Error: failed to work',
        PollingErrorType.WorkError,
        none
      );
      expect(handler).toHaveBeenCalledWith(asErr(expectedError));
      expect(handler.mock.calls[0][0].error.type).toEqual(PollingErrorType.WorkError);
    })
  );

  test(
    'continues polling after work fails',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;
      const bufferCapacity = 2;

      const handler = jest.fn();
      const pollRequests$ = new Subject<Option<string>>();
      let callCount = 0;
      const work = jest.fn(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('failed to work');
        }
        return callCount;
      });
      createTaskPoller<string, number>({
        pollInterval,
        bufferCapacity,
        work,
        getCapacity: () => 5,
        pollRequests$,
      }).subscribe(handler);

      advance(pollInterval);
      await sleep(0);

      expect(handler).toHaveBeenCalledWith(asOk(1));

      advance(pollInterval);
      await sleep(0);

      const expectedError = new PollingError<string>(
        'Failed to poll for work: Error: failed to work',
        PollingErrorType.WorkError,
        none
      );
      expect(handler).toHaveBeenCalledWith(asErr(expectedError));
      expect(handler.mock.calls[1][0].error.type).toEqual(PollingErrorType.WorkError);
      expect(handler).not.toHaveBeenCalledWith(asOk(2));

      advance(pollInterval);
      await sleep(0);

      expect(handler).toHaveBeenCalledWith(asOk(3));
    })
  );

  test(
    'returns a request capcity error when new request is emitted but the poller is at buffer capacity',
    fakeSchedulers(async (advance) => {
      const pollInterval = 1000;
      const bufferCapacity = 2;

      const handler = jest.fn();
      const work = jest.fn(async () => {});
      const pollRequests$ = new Subject<Option<string>>();
      createTaskPoller<string, void>({
        pollInterval,
        bufferCapacity,
        work,
        getCapacity: () => 5,
        pollRequests$,
      }).subscribe(handler);

      // advance(pollInterval);

      pollRequests$.next(some('one'));

      await sleep(0);
      advance(pollInterval);

      expect(work).toHaveBeenCalledWith('one');

      pollRequests$.next(some('two'));
      pollRequests$.next(some('three'));
      // three consecutive should cause us to go above capacity
      pollRequests$.next(some('four'));

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledWith('two', 'three');

      pollRequests$.next(some('five'));
      pollRequests$.next(some('six'));

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledWith('five', 'six');

      expect(handler).toHaveBeenCalledWith(
        asErr(
          new PollingError<string>(
            'Failed to poll for work: request capacity reached',
            PollingErrorType.RequestCapacityReached,
            some('four')
          )
        )
      );
    })
  );
});
