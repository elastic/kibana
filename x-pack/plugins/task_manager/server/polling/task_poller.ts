/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * This module contains the logic for polling the task manager index for new work.
 */

import { of, Observable, combineLatest, timer } from 'rxjs';
import { map, filter, concatMap, tap, catchError, switchMap } from 'rxjs/operators';

import { Option, none } from 'fp-ts/lib/Option';
import { Logger } from '@kbn/core/server';
import { Result, map as mapResult, asOk, asErr, promiseResult } from '../lib/result_type';
import { timeoutPromiseAfter } from './timeout_promise_after';

interface Opts<H> {
  logger: Logger;
  pollInterval$: Observable<number>;
  pollIntervalDelay$: Observable<number>;
  getCapacity: () => number;
  work: () => Promise<H>;
  workTimeout: number;
}

/**
 * constructs a new TaskPoller stream, which emits events on demand and on a scheduled interval, waiting for capacity to be available before emitting more events.
 *
 * @param opts
 * @prop {number} pollInterval - How often, in milliseconds, we will an event be emnitted, assuming there's capacity to do so
 * @prop {() => number} getCapacity - A function specifying whether there is capacity to emit new events
 * @prop {() => Promise<H>} work - The worker we wish to execute in order to `poll`
 *
 * @returns {Observable<Set<T>>} - An observable which emits an event whenever a polling event is due to take place, providing access to a singleton Set representing a queue
 *  of unique request argumets of type T.
 */
export function createTaskPoller<T, H>({
  logger,
  pollInterval$,
  pollIntervalDelay$,
  getCapacity,
  work,
  workTimeout,
}: Opts<H>): Observable<Result<H, PollingError<T>>> {
  const hasCapacity = () => getCapacity() > 0;

  const requestWorkProcessing$ = combineLatest([
    // emit a polling event on a fixed interval
    pollInterval$.pipe(
      tap((period) => {
        logger.debug(`Task poller now using interval of ${period}ms`);
      })
    ),
    pollIntervalDelay$.pipe(
      tap((pollDelay) => {
        logger.debug(`Task poller now delaying emission by ${pollDelay}ms`);
      })
    ),
  ])
    .pipe(
      // We don't have control over `pollDelay` in the poller, and a change to `delayOnClaimConflicts` could accidentally cause us to pause Task Manager
      // polling for a far longer duration that we intended.
      // Since the goal is to shift it within the range of `period`, we use modulo as a safe guard to ensure this doesn't happen.
      switchMap(([period, pollDelay]) => timer(period + (pollDelay % period), period)),
      map(() => none)
    )
    .pipe(
      // only emit polling events when there's capacity to handle them
      filter(hasCapacity),
      // Run a cycle to poll for work
      concatMap(async () => {
        return mapResult<H, Error, Result<H, PollingError<T>>>(
          await promiseResult<H, Error>(
            timeoutPromiseAfter<H, Error>(
              work(),
              workTimeout,
              () => new Error(`work has timed out`)
            )
          ),
          (workResult) => asOk(workResult),
          (err: Error) => asPollingError<T>(err, PollingErrorType.WorkError)
        );
      }),
      // catch errors during polling for work
      catchError((err: Error) => of(asPollingError<T>(err, PollingErrorType.WorkError)))
    );

  return requestWorkProcessing$;
}

export enum PollingErrorType {
  WorkError,
  WorkTimeout,
  RequestCapacityReached,
}

function asPollingError<T>(err: string | Error, type: PollingErrorType, data: Option<T> = none) {
  return asErr(new PollingError<T>(`Failed to poll for work: ${err}`, type, data));
}

export class PollingError<T> extends Error {
  public readonly type: PollingErrorType;
  public readonly data: Option<T>;
  constructor(message: string, type: PollingErrorType, data: Option<T>) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.type = type;
    this.data = data;
  }
}
