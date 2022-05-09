/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { Subject } from 'rxjs';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  createManagedConfiguration,
  ADJUST_THROUGHPUT_INTERVAL,
} from './create_managed_configuration';
import { mockLogger } from '../test_utils';

describe('createManagedConfiguration()', () => {
  let clock: sinon.SinonFakeTimers;
  const logger = mockLogger();

  beforeEach(() => {
    jest.resetAllMocks();
    clock = sinon.useFakeTimers();
  });

  afterEach(() => clock.restore());

  test('returns observables with initialized values', async () => {
    const maxWorkersSubscription = jest.fn();
    const pollIntervalSubscription = jest.fn();
    const { maxWorkersConfiguration$, pollIntervalConfiguration$ } = createManagedConfiguration({
      logger,
      errors$: new Subject<Error>(),
      startingMaxWorkers: 1,
      startingPollInterval: 2,
    });
    maxWorkersConfiguration$.subscribe(maxWorkersSubscription);
    pollIntervalConfiguration$.subscribe(pollIntervalSubscription);
    expect(maxWorkersSubscription).toHaveBeenCalledTimes(1);
    expect(maxWorkersSubscription).toHaveBeenNthCalledWith(1, 1);
    expect(pollIntervalSubscription).toHaveBeenCalledTimes(1);
    expect(pollIntervalSubscription).toHaveBeenNthCalledWith(1, 2);
  });

  test(`skips errors that aren't about too many requests`, async () => {
    const maxWorkersSubscription = jest.fn();
    const pollIntervalSubscription = jest.fn();
    const errors$ = new Subject<Error>();
    const { maxWorkersConfiguration$, pollIntervalConfiguration$ } = createManagedConfiguration({
      errors$,
      logger,
      startingMaxWorkers: 100,
      startingPollInterval: 100,
    });
    maxWorkersConfiguration$.subscribe(maxWorkersSubscription);
    pollIntervalConfiguration$.subscribe(pollIntervalSubscription);
    errors$.next(new Error('foo'));
    clock.tick(ADJUST_THROUGHPUT_INTERVAL);
    expect(maxWorkersSubscription).toHaveBeenCalledTimes(1);
    expect(pollIntervalSubscription).toHaveBeenCalledTimes(1);
  });

  describe('maxWorker configuration', () => {
    function setupScenario(startingMaxWorkers: number) {
      const errors$ = new Subject<Error>();
      const subscription = jest.fn();
      const { maxWorkersConfiguration$ } = createManagedConfiguration({
        errors$,
        startingMaxWorkers,
        logger,
        startingPollInterval: 1,
      });
      maxWorkersConfiguration$.subscribe(subscription);
      return { subscription, errors$ };
    }

    beforeEach(() => {
      jest.resetAllMocks();
      clock = sinon.useFakeTimers();
    });

    afterEach(() => clock.restore());

    test('should decrease configuration at the next interval when an error is emitted', async () => {
      const { subscription, errors$ } = setupScenario(100);
      errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
      clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
      expect(subscription).toHaveBeenCalledTimes(1);
      clock.tick(1);
      expect(subscription).toHaveBeenCalledTimes(2);
      expect(subscription).toHaveBeenNthCalledWith(2, 80);
    });

    test('should log a warning when the configuration changes from the starting value', async () => {
      const { errors$ } = setupScenario(100);
      errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
      clock.tick(ADJUST_THROUGHPUT_INTERVAL);
      expect(logger.warn).toHaveBeenCalledWith(
        'Max workers configuration is temporarily reduced after Elasticsearch returned 1 "too many request" and/or "execute [inline] script" error(s).'
      );
    });

    test('should increase configuration back to normal incrementally after an error is emitted', async () => {
      const { subscription, errors$ } = setupScenario(100);
      errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
      clock.tick(ADJUST_THROUGHPUT_INTERVAL * 10);
      expect(subscription).toHaveBeenNthCalledWith(2, 80);
      expect(subscription).toHaveBeenNthCalledWith(3, 84);
      // 88.2- > 89 from Math.ceil
      expect(subscription).toHaveBeenNthCalledWith(4, 89);
      expect(subscription).toHaveBeenNthCalledWith(5, 94);
      expect(subscription).toHaveBeenNthCalledWith(6, 99);
      // 103.95 -> 100 from Math.min with starting value
      expect(subscription).toHaveBeenNthCalledWith(7, 100);
      // No new calls due to value not changing and usage of distinctUntilChanged()
      expect(subscription).toHaveBeenCalledTimes(7);
    });

    test('should keep reducing configuration when errors keep emitting', async () => {
      const { subscription, errors$ } = setupScenario(100);
      for (let i = 0; i < 20; i++) {
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
      }
      expect(subscription).toHaveBeenNthCalledWith(2, 80);
      expect(subscription).toHaveBeenNthCalledWith(3, 64);
      // 51.2 -> 51 from Math.floor
      expect(subscription).toHaveBeenNthCalledWith(4, 51);
      expect(subscription).toHaveBeenNthCalledWith(5, 40);
      expect(subscription).toHaveBeenNthCalledWith(6, 32);
      expect(subscription).toHaveBeenNthCalledWith(7, 25);
      expect(subscription).toHaveBeenNthCalledWith(8, 20);
      expect(subscription).toHaveBeenNthCalledWith(9, 16);
      expect(subscription).toHaveBeenNthCalledWith(10, 12);
      expect(subscription).toHaveBeenNthCalledWith(11, 9);
      expect(subscription).toHaveBeenNthCalledWith(12, 7);
      expect(subscription).toHaveBeenNthCalledWith(13, 5);
      expect(subscription).toHaveBeenNthCalledWith(14, 4);
      expect(subscription).toHaveBeenNthCalledWith(15, 3);
      expect(subscription).toHaveBeenNthCalledWith(16, 2);
      expect(subscription).toHaveBeenNthCalledWith(17, 1);
      // No new calls due to value not changing and usage of distinctUntilChanged()
      expect(subscription).toHaveBeenCalledTimes(17);
    });
  });

  describe('pollInterval configuration', () => {
    function setupScenario(startingPollInterval: number) {
      const errors$ = new Subject<Error>();
      const subscription = jest.fn();
      const { pollIntervalConfiguration$ } = createManagedConfiguration({
        logger,
        errors$,
        startingPollInterval,
        startingMaxWorkers: 1,
      });
      pollIntervalConfiguration$.subscribe(subscription);
      return { subscription, errors$ };
    }

    beforeEach(() => {
      jest.resetAllMocks();
      clock = sinon.useFakeTimers();
    });

    afterEach(() => clock.restore());

    test('should increase configuration at the next interval when an error is emitted', async () => {
      const { subscription, errors$ } = setupScenario(100);
      errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
      clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
      expect(subscription).toHaveBeenCalledTimes(1);
      clock.tick(1);
      expect(subscription).toHaveBeenCalledTimes(2);
      expect(subscription).toHaveBeenNthCalledWith(2, 120);
    });

    test('should log a warning when the configuration changes from the starting value', async () => {
      const { errors$ } = setupScenario(100);
      errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
      clock.tick(ADJUST_THROUGHPUT_INTERVAL);
      expect(logger.warn).toHaveBeenCalledWith(
        'Poll interval configuration is temporarily increased after Elasticsearch returned 1 "too many request" and/or "execute [inline] script" error(s).'
      );
    });

    test('should decrease configuration back to normal incrementally after an error is emitted', async () => {
      const { subscription, errors$ } = setupScenario(100);
      errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
      clock.tick(ADJUST_THROUGHPUT_INTERVAL * 10);
      expect(subscription).toHaveBeenNthCalledWith(2, 120);
      expect(subscription).toHaveBeenNthCalledWith(3, 114);
      // 108.3 -> 108 from Math.floor
      expect(subscription).toHaveBeenNthCalledWith(4, 108);
      expect(subscription).toHaveBeenNthCalledWith(5, 102);
      // 96.9 -> 100 from Math.max with the starting value
      expect(subscription).toHaveBeenNthCalledWith(6, 100);
      // No new calls due to value not changing and usage of distinctUntilChanged()
      expect(subscription).toHaveBeenCalledTimes(6);
    });

    test('should increase configuration when errors keep emitting', async () => {
      const { subscription, errors$ } = setupScenario(100);
      for (let i = 0; i < 3; i++) {
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
      }
      expect(subscription).toHaveBeenNthCalledWith(2, 120);
      expect(subscription).toHaveBeenNthCalledWith(3, 144);
      // 172.8 -> 173 from Math.ceil
      expect(subscription).toHaveBeenNthCalledWith(4, 173);
    });
  });
});
