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
import { CLAIM_STRATEGY_UPDATE_BY_QUERY, CLAIM_STRATEGY_MGET, TaskManagerConfig } from '../config';
import { MsearchError } from './msearch_error';
import { BulkUpdateError } from './bulk_update_error';

describe('createManagedConfiguration()', () => {
  let clock: sinon.SinonFakeTimers;
  const logger = mockLogger();

  beforeEach(() => {
    jest.resetAllMocks();
    clock = sinon.useFakeTimers();
  });

  afterEach(() => clock.restore());

  test('returns observables with initialized values', async () => {
    const capacitySubscription = jest.fn();
    const pollIntervalSubscription = jest.fn();
    const { capacityConfiguration$, pollIntervalConfiguration$ } = createManagedConfiguration({
      logger,
      errors$: new Subject<Error>(),
      config: {
        capacity: 20,
        poll_interval: 2,
      } as TaskManagerConfig,
    });
    capacityConfiguration$.subscribe(capacitySubscription);
    pollIntervalConfiguration$.subscribe(pollIntervalSubscription);
    expect(capacitySubscription).toHaveBeenCalledTimes(1);
    expect(capacitySubscription).toHaveBeenNthCalledWith(1, 20);
    expect(pollIntervalSubscription).toHaveBeenCalledTimes(1);
    expect(pollIntervalSubscription).toHaveBeenNthCalledWith(1, 2);
  });

  test('uses max_workers config as capacity if only max workers is defined', async () => {
    const capacitySubscription = jest.fn();
    const pollIntervalSubscription = jest.fn();
    const { capacityConfiguration$, pollIntervalConfiguration$ } = createManagedConfiguration({
      logger,
      errors$: new Subject<Error>(),
      config: {
        max_workers: 10,
        poll_interval: 2,
      } as TaskManagerConfig,
    });
    capacityConfiguration$.subscribe(capacitySubscription);
    pollIntervalConfiguration$.subscribe(pollIntervalSubscription);
    expect(capacitySubscription).toHaveBeenCalledTimes(1);
    expect(capacitySubscription).toHaveBeenNthCalledWith(1, 10);
    expect(pollIntervalSubscription).toHaveBeenCalledTimes(1);
    expect(pollIntervalSubscription).toHaveBeenNthCalledWith(1, 2);
  });

  test('uses max_workers config as capacity but does not exceed MAX_CAPACITY', async () => {
    const capacitySubscription = jest.fn();
    const pollIntervalSubscription = jest.fn();
    const { capacityConfiguration$, pollIntervalConfiguration$ } = createManagedConfiguration({
      logger,
      errors$: new Subject<Error>(),
      config: {
        max_workers: 1000,
        poll_interval: 2,
      } as TaskManagerConfig,
    });
    capacityConfiguration$.subscribe(capacitySubscription);
    pollIntervalConfiguration$.subscribe(pollIntervalSubscription);
    expect(capacitySubscription).toHaveBeenCalledTimes(1);
    expect(capacitySubscription).toHaveBeenNthCalledWith(1, 50);
    expect(pollIntervalSubscription).toHaveBeenCalledTimes(1);
    expect(pollIntervalSubscription).toHaveBeenNthCalledWith(1, 2);
  });

  test('uses provided defaultCapacity if neither capacity nor max_workers is defined', async () => {
    const capacitySubscription = jest.fn();
    const pollIntervalSubscription = jest.fn();
    const { capacityConfiguration$, pollIntervalConfiguration$ } = createManagedConfiguration({
      defaultCapacity: 500,
      logger,
      errors$: new Subject<Error>(),
      config: {
        poll_interval: 2,
      } as TaskManagerConfig,
    });
    capacityConfiguration$.subscribe(capacitySubscription);
    pollIntervalConfiguration$.subscribe(pollIntervalSubscription);
    expect(capacitySubscription).toHaveBeenCalledTimes(1);
    expect(capacitySubscription).toHaveBeenNthCalledWith(1, 500);
    expect(pollIntervalSubscription).toHaveBeenCalledTimes(1);
    expect(pollIntervalSubscription).toHaveBeenNthCalledWith(1, 2);
  });

  test('logs warning and uses capacity config if both capacity and max_workers is defined', async () => {
    const capacitySubscription = jest.fn();
    const pollIntervalSubscription = jest.fn();
    const { capacityConfiguration$, pollIntervalConfiguration$ } = createManagedConfiguration({
      logger,
      errors$: new Subject<Error>(),
      config: {
        capacity: 30,
        max_workers: 10,
        poll_interval: 2,
      } as TaskManagerConfig,
    });
    capacityConfiguration$.subscribe(capacitySubscription);
    pollIntervalConfiguration$.subscribe(pollIntervalSubscription);
    expect(capacitySubscription).toHaveBeenCalledTimes(1);
    expect(capacitySubscription).toHaveBeenNthCalledWith(1, 30);
    expect(pollIntervalSubscription).toHaveBeenCalledTimes(1);
    expect(pollIntervalSubscription).toHaveBeenNthCalledWith(1, 2);
    expect(logger.warn).toHaveBeenCalledWith(
      `Both \"xpack.task_manager.capacity\" and \"xpack.task_manager.max_workers\" configs are set, max_workers will be ignored in favor of capacity and the setting should be removed.`
    );
  });

  test(`skips errors that aren't about too many requests`, async () => {
    const capacitySubscription = jest.fn();
    const pollIntervalSubscription = jest.fn();
    const errors$ = new Subject<Error>();
    const { capacityConfiguration$, pollIntervalConfiguration$ } = createManagedConfiguration({
      errors$,
      logger,
      config: {
        capacity: 10,
        poll_interval: 100,
      } as TaskManagerConfig,
    });
    capacityConfiguration$.subscribe(capacitySubscription);
    pollIntervalConfiguration$.subscribe(pollIntervalSubscription);
    errors$.next(new Error('foo'));
    clock.tick(ADJUST_THROUGHPUT_INTERVAL);
    expect(capacitySubscription).toHaveBeenCalledTimes(1);
    expect(pollIntervalSubscription).toHaveBeenCalledTimes(1);
  });

  describe('capacity configuration', () => {
    function setupScenario(
      startingCapacity: number,
      claimStrategy: string = CLAIM_STRATEGY_UPDATE_BY_QUERY
    ) {
      const errors$ = new Subject<Error>();
      const subscription = jest.fn();
      const { capacityConfiguration$ } = createManagedConfiguration({
        errors$,
        logger,
        config: {
          capacity: startingCapacity,
          poll_interval: 1,
          claim_strategy: claimStrategy,
        } as TaskManagerConfig,
      });
      capacityConfiguration$.subscribe(subscription);
      return { subscription, errors$ };
    }

    beforeEach(() => {
      jest.resetAllMocks();
      clock = sinon.useFakeTimers();
    });

    afterEach(() => clock.restore());

    describe('default claim strategy', () => {
      test('should decrease configuration at the next interval when an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a 500 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(SavedObjectsErrorHelpers.decorateGeneralError(new Error('a'), 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a 503 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should log a warning when the configuration changes from the starting value', async () => {
        const { errors$ } = setupScenario(10);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.warn).toHaveBeenCalledWith(
          'Capacity configuration is temporarily reduced after Elasticsearch returned 1 "too many request" and/or "execute [inline] script" error(s).'
        );
      });

      test('should increase configuration back to normal incrementally after an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL * 10);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
        expect(subscription).toHaveBeenNthCalledWith(3, 9);
        expect(subscription).toHaveBeenNthCalledWith(4, 10);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(4);
      });

      test('should keep reducing configuration when errors keep emitting until it reaches minimum', async () => {
        const { subscription, errors$ } = setupScenario(10);
        for (let i = 0; i < 20; i++) {
          errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
          clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        }
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
        expect(subscription).toHaveBeenNthCalledWith(3, 6);
        expect(subscription).toHaveBeenNthCalledWith(4, 4);
        expect(subscription).toHaveBeenNthCalledWith(5, 3);
        expect(subscription).toHaveBeenNthCalledWith(6, 2);
        expect(subscription).toHaveBeenNthCalledWith(7, 1);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(7);
      });
    });

    describe('mget claim strategy', () => {
      test('should decrease configuration at the next interval when an msearch 429 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(429));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when an msearch 500 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(500));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when an msearch 503 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(503));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a bulkPartialUpdate 429 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(
          new BulkUpdateError({ statusCode: 429, message: 'test', type: 'too_many_requests' })
        );
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a bulkPartialUpdate 500 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(
          new BulkUpdateError({ statusCode: 500, message: 'test', type: 'server_error' })
        );
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a bulkPartialUpdate 503 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(
          new BulkUpdateError({ statusCode: 503, message: 'test', type: 'unavailable' })
        );
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should not change configuration at the next interval when other msearch error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(404));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(1);
      });

      test('should log a warning when the configuration changes from the starting value', async () => {
        const { errors$ } = setupScenario(10, CLAIM_STRATEGY_MGET);
        errors$.next(new MsearchError(429));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.warn).toHaveBeenCalledWith(
          'Capacity configuration is temporarily reduced after Elasticsearch returned 1 "too many request" and/or "execute [inline] script" error(s).'
        );
      });

      test('should increase configuration back to normal incrementally after an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10, CLAIM_STRATEGY_MGET);
        errors$.next(new MsearchError(429));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL * 10);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
        expect(subscription).toHaveBeenNthCalledWith(3, 9);
        expect(subscription).toHaveBeenNthCalledWith(4, 10);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(4);
      });

      test('should keep reducing configuration when errors keep emitting until it reaches minimum', async () => {
        const { subscription, errors$ } = setupScenario(10, CLAIM_STRATEGY_MGET);
        for (let i = 0; i < 20; i++) {
          errors$.next(new MsearchError(429));
          clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        }
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
        expect(subscription).toHaveBeenNthCalledWith(3, 6);
        expect(subscription).toHaveBeenNthCalledWith(4, 5);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('pollInterval configuration', () => {
    function setupScenario(startingPollInterval: number) {
      const errors$ = new Subject<Error>();
      const subscription = jest.fn();
      const { pollIntervalConfiguration$ } = createManagedConfiguration({
        logger,
        errors$,
        config: {
          poll_interval: startingPollInterval,
          capacity: 20,
        } as TaskManagerConfig,
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

    test('should increase configuration at the next interval when a 500 error is emitted', async () => {
      const { subscription, errors$ } = setupScenario(100);
      errors$.next(SavedObjectsErrorHelpers.decorateGeneralError(new Error('a'), 'b'));
      clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
      expect(subscription).toHaveBeenCalledTimes(1);
      clock.tick(1);
      expect(subscription).toHaveBeenCalledTimes(2);
      expect(subscription).toHaveBeenNthCalledWith(2, 120);
    });

    test('should increase configuration at the next interval when a 503 error is emitted', async () => {
      const { subscription, errors$ } = setupScenario(100);
      errors$.next(SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError('a', 'b'));
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

    test('should log a warning when an issue occurred in the calculating of the increased poll interval', async () => {
      const { errors$ } = setupScenario(NaN);
      errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
      clock.tick(ADJUST_THROUGHPUT_INTERVAL);
      expect(logger.error).toHaveBeenCalledWith(
        'Poll interval configuration had an issue calculating the new poll interval: Math.min(Math.ceil(NaN * 1.2), Math.max(60000, NaN)) = NaN, will keep the poll interval unchanged (NaN)'
      );
    });

    test('should log a warning when an issue occurred in the calculating of the decreased poll interval', async () => {
      setupScenario(NaN);
      clock.tick(ADJUST_THROUGHPUT_INTERVAL);
      expect(logger.error).toHaveBeenCalledWith(
        'Poll interval configuration had an issue calculating the new poll interval: Math.max(NaN, Math.floor(NaN * 0.95)) = NaN, will keep the poll interval unchanged (NaN)'
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

    test('should limit the upper bound to 60s by default', async () => {
      const { subscription, errors$ } = setupScenario(3000);
      for (let i = 0; i < 18; i++) {
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
      }
      expect(subscription).toHaveBeenNthCalledWith(2, 3600);
      expect(subscription).toHaveBeenNthCalledWith(3, 4320);
      expect(subscription).toHaveBeenNthCalledWith(4, 5184);
      expect(subscription).toHaveBeenNthCalledWith(5, 6221);
      expect(subscription).toHaveBeenNthCalledWith(6, 7466);
      expect(subscription).toHaveBeenNthCalledWith(7, 8960);
      expect(subscription).toHaveBeenNthCalledWith(8, 10752);
      expect(subscription).toHaveBeenNthCalledWith(9, 12903);
      expect(subscription).toHaveBeenNthCalledWith(10, 15484);
      expect(subscription).toHaveBeenNthCalledWith(11, 18581);
      expect(subscription).toHaveBeenNthCalledWith(12, 22298);
      expect(subscription).toHaveBeenNthCalledWith(13, 26758);
      expect(subscription).toHaveBeenNthCalledWith(14, 32110);
      expect(subscription).toHaveBeenNthCalledWith(15, 38532);
      expect(subscription).toHaveBeenNthCalledWith(16, 46239);
      expect(subscription).toHaveBeenNthCalledWith(17, 55487);
      expect(subscription).toHaveBeenNthCalledWith(18, 60000);
    });

    test('should not adjust poll interval dynamically if initial value is > 60s', async () => {
      const { subscription, errors$ } = setupScenario(65000);
      for (let i = 0; i < 5; i++) {
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
      }
      expect(subscription).toHaveBeenCalledTimes(1);
      expect(subscription).toHaveBeenNthCalledWith(1, 65000);
    });
  });
});
