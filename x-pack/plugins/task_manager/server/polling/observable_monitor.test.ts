/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { interval, from, Subject } from 'rxjs';
import { map, concatMap, takeWhile, take } from 'rxjs/operators';

import { createObservableMonitor } from './observable_monitor';
import { times } from 'lodash';

describe('Poll Monitor', () => {
  test('returns a cold observable so that the monitored Observable is only created on demand', async () => {
    const instantiator = jest.fn(() => new Subject());

    createObservableMonitor(instantiator);

    expect(instantiator).not.toHaveBeenCalled();
  });

  test('subscribing to the observable instantiates a new observable and pipes its results through', async () => {
    const instantiator = jest.fn(() => from([0, 1, 2]));
    const monitoredObservable = createObservableMonitor(instantiator);

    expect(instantiator).not.toHaveBeenCalled();

    return new Promise((resolve) => {
      const next = jest.fn();
      monitoredObservable.pipe(take(3)).subscribe({
        next,
        complete: () => {
          expect(instantiator).toHaveBeenCalled();
          expect(next).toHaveBeenCalledWith(0);
          expect(next).toHaveBeenCalledWith(1);
          expect(next).toHaveBeenCalledWith(2);
          resolve();
        },
      });
    });
  });

  test('unsubscribing from the monitor prevents the monitor from resubscribing to the observable', async () => {
    const heartbeatInterval = 1000;
    const instantiator = jest.fn(() => interval(100));
    const monitoredObservable = createObservableMonitor(instantiator, { heartbeatInterval });

    return new Promise((resolve) => {
      const next = jest.fn();
      monitoredObservable.pipe(take(3)).subscribe({
        next,
        complete: () => {
          expect(instantiator).toHaveBeenCalledTimes(1);
          setTimeout(() => {
            expect(instantiator).toHaveBeenCalledTimes(1);
            resolve();
          }, heartbeatInterval * 2);
        },
      });
    });
  });

  test(`ensures the observable subscription hasn't closed at a fixed interval and reinstantiates if it has`, async () => {
    let iteration = 0;
    const instantiator = jest.fn(() => {
      iteration++;
      return interval(100).pipe(
        map((index) => `${iteration}:${index}`),
        // throw on 3rd value of the first iteration
        map((value, index) => {
          if (iteration === 1 && index === 3) {
            throw new Error('Source threw an error!');
          }
          return value;
        })
      );
    });

    const onError = jest.fn();
    const monitoredObservable = createObservableMonitor(instantiator, { onError });

    return new Promise((resolve) => {
      const next = jest.fn();
      const error = jest.fn();
      monitoredObservable
        .pipe(
          // unsubscribe once we confirm we have successfully recovered from an error in the source
          takeWhile(function validateExpectation() {
            try {
              [...times(3, (index) => `1:${index}`), ...times(5, (index) => `2:${index}`)].forEach(
                (expecteArg) => {
                  expect(next).toHaveBeenCalledWith(expecteArg);
                }
              );
              return false;
            } catch {
              return true;
            }
          })
        )
        .subscribe({
          next,
          error,
          complete: () => {
            expect(error).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalledWith(new Error('Source threw an error!'));
            resolve();
          },
        });
    });
  });

  test(`ensures the observable subscription hasn't hung at a fixed interval and reinstantiates if it has`, async () => {
    let iteration = 0;
    const instantiator = jest.fn(() => {
      iteration++;
      return interval(100).pipe(
        map((index) => `${iteration}:${index}`),
        // hang on 3rd value of the first iteration
        concatMap((value, index) => {
          if (iteration === 1 && index === 3) {
            return new Promise(() => {
              // never resolve or reject, just hang for EVER
            });
          }
          return Promise.resolve(value);
        })
      );
    });

    const onError = jest.fn();
    const monitoredObservable = createObservableMonitor(instantiator, {
      onError,
      heartbeatInterval: 100,
      inactivityTimeout: 500,
    });

    return new Promise((resolve) => {
      const next = jest.fn();
      const error = jest.fn();
      monitoredObservable
        .pipe(
          // unsubscribe once we confirm we have successfully recovered from an error in the source
          takeWhile(function validateExpectation() {
            try {
              [...times(3, (index) => `1:${index}`), ...times(5, (index) => `2:${index}`)].forEach(
                (expecteArg) => {
                  expect(next).toHaveBeenCalledWith(expecteArg);
                }
              );
              return false;
            } catch {
              return true;
            }
          })
        )
        .subscribe({
          next,
          error,
          complete: () => {
            expect(error).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalledWith(
              new Error(`Observable Monitor: Hung Observable restarted after 500ms of inactivity`)
            );
            resolve();
          },
        });
    });
  });
});
