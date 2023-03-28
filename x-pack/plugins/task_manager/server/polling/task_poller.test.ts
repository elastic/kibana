/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, BehaviorSubject } from 'rxjs';
import { none } from 'fp-ts/lib/Option';
import { createTaskPoller, PollingError, PollingErrorType } from './task_poller';
import { fakeSchedulers } from 'rxjs-marbles/jest';
import { sleep, resolvable, Resolvable } from '../test_utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { asOk, asErr } from '../lib/result_type';

describe('TaskPoller', () => {
  beforeEach(() => jest.useFakeTimers({ legacyFakeTimers: true }));

  test(
    'intializes the poller with the provided interval',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;
      const halfInterval = Math.floor(pollInterval / 2);

      const work = jest.fn(async () => true);
      createTaskPoller<void, boolean>({
        initialPollInterval: pollInterval,
        logger: loggingSystemMock.create().get(),
        pollInterval$: of(pollInterval),
        pollIntervalDelay$: of(0),
        getCapacity: () => 1,
        work,
        workTimeout: pollInterval * 5,
      }).start();

      expect(work).toHaveBeenCalledTimes(1);

      // `work` is async, we have to force a node `tick`
      await sleep(0);
      advance(halfInterval);
      expect(work).toHaveBeenCalledTimes(1);
      advance(halfInterval);

      await sleep(0);
      expect(work).toHaveBeenCalledTimes(2);

      await sleep(0);
      await sleep(0);
      advance(pollInterval + 10);
      await sleep(0);
      expect(work).toHaveBeenCalledTimes(3);
    })
  );

  test(
    'poller adapts to pollInterval changes',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;
      const pollInterval$ = new BehaviorSubject(pollInterval);

      const work = jest.fn(async () => true);
      createTaskPoller<void, boolean>({
        initialPollInterval: pollInterval,
        logger: loggingSystemMock.create().get(),
        pollInterval$,
        pollIntervalDelay$: of(0),
        getCapacity: () => 1,
        work,
        workTimeout: pollInterval * 5,
      }).start();

      expect(work).toHaveBeenCalledTimes(1);

      // `work` is async, we have to force a node `tick`
      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);

      pollInterval$.next(pollInterval * 2);

      // `work` is async, we have to force a node `tick`
      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(3);

      pollInterval$.next(pollInterval / 2);

      // `work` is async, we have to force a node `tick`
      await sleep(0);
      advance(pollInterval / 2);
      expect(work).toHaveBeenCalledTimes(4);
    })
  );

  test(
    'filters interval polling on capacity',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;

      const work = jest.fn(async () => true);

      let hasCapacity = true;
      createTaskPoller<void, boolean>({
        initialPollInterval: pollInterval,
        logger: loggingSystemMock.create().get(),
        pollInterval$: of(pollInterval),
        pollIntervalDelay$: of(0),
        work,
        workTimeout: pollInterval * 5,
        getCapacity: () => (hasCapacity ? 1 : 0),
      }).start();

      expect(work).toHaveBeenCalledTimes(1);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(2);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(3);

      hasCapacity = false;

      await sleep(0);
      advance(pollInterval);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(3);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(3);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(3);

      hasCapacity = true;

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(4);

      await sleep(0);
      advance(pollInterval);
      expect(work).toHaveBeenCalledTimes(5);
    })
  );

  test(
    'waits for work to complete before emitting the next event',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;

      const worker = resolvable();

      const handler = jest.fn();
      const poller = createTaskPoller<string, string[]>({
        initialPollInterval: pollInterval,
        logger: loggingSystemMock.create().get(),
        pollInterval$: of(pollInterval),
        pollIntervalDelay$: of(0),
        work: async (...args) => {
          await worker;
          return args;
        },
        getCapacity: () => 5,
        workTimeout: pollInterval * 5,
      });
      poller.events$.subscribe(handler);
      poller.start();

      advance(pollInterval);

      // work should now be in progress

      advance(pollInterval);
      await sleep(pollInterval);

      expect(handler).toHaveBeenCalledTimes(0);

      worker.resolve();

      advance(pollInterval);
      await sleep(pollInterval);

      expect(handler).toHaveBeenCalledTimes(1);

      advance(pollInterval);

      expect(handler).toHaveBeenCalledTimes(1);
    })
  );

  test(
    'work times out when it exceeds a predefined amount of time',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;
      const workTimeout = pollInterval * 2;

      const handler = jest.fn();

      type ResolvableTupple = [string, PromiseLike<void> & Resolvable];
      const poller = createTaskPoller<[string, Resolvable], string[]>({
        initialPollInterval: pollInterval,
        logger: loggingSystemMock.create().get(),
        pollInterval$: of(pollInterval),
        pollIntervalDelay$: of(0),
        work: async () => {
          return [];
        },
        getCapacity: () => 5,
        workTimeout,
      });
      poller.events$.subscribe(handler);
      poller.start();

      const one: ResolvableTupple = ['one', resolvable()];

      // split these into two payloads
      advance(pollInterval);

      const two: ResolvableTupple = ['two', resolvable()];
      const three: ResolvableTupple = ['three', resolvable()];

      advance(workTimeout);
      await sleep(workTimeout);

      // one resolves too late!
      one[1].resolve();

      expect(handler).toHaveBeenCalledWith(
        asErr(
          new PollingError<string>(
            'Failed to poll for work: Error: work has timed out',
            PollingErrorType.WorkError,
            none
          )
        )
      );
      expect(handler.mock.calls[0][0].error.type).toEqual(PollingErrorType.WorkError);

      // two and three in time
      two[1].resolve();
      three[1].resolve();

      advance(pollInterval);
      await sleep(pollInterval);

      expect(handler).toHaveBeenCalledTimes(2);
    })
  );

  test(
    'returns an error when polling for work fails',
    fakeSchedulers(async (advance) => {
      const pollInterval = 100;

      const handler = jest.fn();
      const poller = createTaskPoller<string, string[]>({
        initialPollInterval: pollInterval,
        logger: loggingSystemMock.create().get(),
        pollInterval$: of(pollInterval),
        pollIntervalDelay$: of(0),
        work: async (...args) => {
          throw new Error('failed to work');
        },
        workTimeout: pollInterval * 5,
        getCapacity: () => 5,
      });
      poller.events$.subscribe(handler);
      poller.start();

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

      const handler = jest.fn();
      let callCount = 0;
      const work = jest.fn(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('failed to work');
        }
        return callCount;
      });
      const poller = createTaskPoller<string, number>({
        initialPollInterval: pollInterval,
        logger: loggingSystemMock.create().get(),
        pollInterval$: of(pollInterval),
        pollIntervalDelay$: of(0),
        work,
        workTimeout: pollInterval * 5,
        getCapacity: () => 5,
      });
      poller.events$.subscribe(handler);
      poller.start();

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
});
