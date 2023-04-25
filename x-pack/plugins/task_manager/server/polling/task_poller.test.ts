/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { of, BehaviorSubject } from 'rxjs';
import { none } from 'fp-ts/lib/Option';
import { createTaskPoller, PollingError, PollingErrorType } from './task_poller';
import { sleep, resolvable } from '../test_utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { asOk, asErr } from '../lib/result_type';

describe('TaskPoller', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => clock.restore());

  test('intializes the poller with the provided interval', async () => {
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
    }).start();

    expect(work).toHaveBeenCalledTimes(1);

    // `work` is async, we have to force a node `tick`
    await sleep(0);
    clock.tick(halfInterval);
    expect(work).toHaveBeenCalledTimes(1);
    clock.tick(halfInterval);

    await sleep(0);
    expect(work).toHaveBeenCalledTimes(2);

    await sleep(0);
    await sleep(0);
    clock.tick(pollInterval + 10);
    await sleep(0);
    expect(work).toHaveBeenCalledTimes(3);
  });

  test('poller adapts to pollInterval changes', async () => {
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
    }).start();

    expect(work).toHaveBeenCalledTimes(1);

    // `work` is async, we have to force a node `tick`
    await sleep(0);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(2);

    pollInterval$.next(pollInterval * 2);

    // `work` is async, we have to force a node `tick`
    await sleep(0);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(2);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    pollInterval$.next(pollInterval / 2);

    // `work` is async, we have to force a node `tick`
    await sleep(0);
    clock.tick(pollInterval / 2);
    expect(work).toHaveBeenCalledTimes(4);
  });

  test('filters interval polling on capacity', async () => {
    const pollInterval = 100;

    const work = jest.fn(async () => true);

    let hasCapacity = true;
    createTaskPoller<void, boolean>({
      initialPollInterval: pollInterval,
      logger: loggingSystemMock.create().get(),
      pollInterval$: of(pollInterval),
      pollIntervalDelay$: of(0),
      work,
      getCapacity: () => (hasCapacity ? 1 : 0),
    }).start();

    expect(work).toHaveBeenCalledTimes(1);

    await sleep(0);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(2);

    await sleep(0);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    hasCapacity = false;

    await sleep(0);
    clock.tick(pollInterval);

    await sleep(0);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    await sleep(0);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    await sleep(0);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    hasCapacity = true;

    await sleep(0);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(4);

    await sleep(0);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(5);
  });

  test('waits for work to complete before emitting the next event', async () => {
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
    });
    poller.events$.subscribe(handler);
    poller.start();

    clock.tick(pollInterval);

    // work should now be in progress

    clock.tick(pollInterval);
    await sleep(pollInterval);

    expect(handler).toHaveBeenCalledTimes(0);

    worker.resolve();

    clock.tick(pollInterval);
    await sleep(pollInterval);

    expect(handler).toHaveBeenCalledTimes(1);

    clock.tick(pollInterval);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('returns an error when polling for work fails', async () => {
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
      getCapacity: () => 5,
    });
    poller.events$.subscribe(handler);
    poller.start();

    clock.tick(pollInterval);
    await sleep(0);

    const expectedError = new PollingError<string>(
      'Failed to poll for work: Error: failed to work',
      PollingErrorType.WorkError,
      none
    );
    expect(handler).toHaveBeenCalledWith(asErr(expectedError));
    expect(handler.mock.calls[0][0].error.type).toEqual(PollingErrorType.WorkError);
  });

  test('continues polling after work fails', async () => {
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
      getCapacity: () => 5,
    });
    poller.events$.subscribe(handler);
    poller.start();

    clock.tick(pollInterval);
    await sleep(0);

    expect(handler).toHaveBeenCalledWith(asOk(1));

    clock.tick(pollInterval);
    await sleep(0);

    const expectedError = new PollingError<string>(
      'Failed to poll for work: Error: failed to work',
      PollingErrorType.WorkError,
      none
    );
    expect(handler).toHaveBeenCalledWith(asErr(expectedError));
    expect(handler.mock.calls[1][0].error.type).toEqual(PollingErrorType.WorkError);
    expect(handler).not.toHaveBeenCalledWith(asOk(2));

    clock.tick(pollInterval);
    await sleep(0);

    expect(handler).toHaveBeenCalledWith(asOk(3));
  });
});
