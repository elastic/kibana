/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains the logic for polling the task manager index for new work.
 */

import { performance } from 'perf_hooks';
import { after } from 'lodash';
import { Subject, merge, interval, of, Observable } from 'rxjs';
import { mapTo, filter, scan, concatMap, tap, catchError } from 'rxjs/operators';

import { pipe } from 'fp-ts/lib/pipeable';
import { Option, none, map as mapOptional, getOrElse } from 'fp-ts/lib/Option';
import { pullFromSet } from '../lib/pull_from_set';
import {
  Result,
  Err,
  isErr,
  map as mapResult,
  asOk,
  asErr,
  promiseResult,
} from '../lib/result_type';
import { timeoutPromiseAfter } from './timeout_promise_after';

type WorkFn<T, H> = (...params: T[]) => Promise<H>;

interface Opts<T, H> {
  pollInterval: number;
  bufferCapacity: number;
  getCapacity: () => number;
  pollRequests$: Observable<Option<T>>;
  work: WorkFn<T, H>;
  workTimeout?: number;
}

/**
 * constructs a new TaskPoller stream, which emits events on demand and on a scheduled interval, waiting for capacity to be available before emitting more events.
 *
 * @param opts
 * @prop {number} pollInterval - How often, in milliseconds, we will an event be emnitted, assuming there's capacity to do so
 * @prop {() => number} getCapacity - A function specifying whether there is capacity to emit new events
 * @prop {Observable<Option<T>>} pollRequests$ - A stream of requests for polling which can provide an optional argument for the polling phase
 * @prop {number} bufferCapacity - How many requests are do we allow our buffer to accumulate before rejecting requests?
 * @prop {(...params: T[]) => Promise<H>} work - The work we wish to execute in order to `poll`, this is the operation we're actually executing on request
 *
 * @returns {Observable<Set<T>>} - An observable which emits an event whenever a polling event is due to take place, providing access to a singleton Set representing a queue
 *  of unique request argumets of type T. The queue holds all the buffered request arguments streamed in via pollRequests$
 */
export function createTaskPoller<T, H>({
  pollInterval,
  getCapacity,
  pollRequests$,
  bufferCapacity,
  work,
  workTimeout,
}: Opts<T, H>): Observable<Result<H, PollingError<T>>> {
  const hasCapacity = () => getCapacity() > 0;

  const errors$ = new Subject<Err<PollingError<T>>>();

  const requestWorkProcessing$ = merge(
    // emit a polling event on demand
    pollRequests$,
    // emit a polling event on a fixed interval
    interval(pollInterval).pipe(mapTo(none))
  ).pipe(
    // buffer all requests in a single set (to remove duplicates) as we don't want
    // work to take place in parallel (it could cause Task Manager to pull in the same
    // task twice)
    scan<Option<T>, Set<T>>((queue, request) => {
      if (isErr(pushOptionalIntoSet(queue, bufferCapacity, request))) {
        // value wasnt pushed into buffer, we must be at capacity
        errors$.next(
          asPollingError<T>(
            `request capacity reached`,
            PollingErrorType.RequestCapacityReached,
            request
          )
        );
      }
      return queue;
    }, new Set<T>()),
    // only emit polling events when there's capacity to handle them
    filter(hasCapacity),
    // take as many argumented calls as we have capacity for and call `work` with
    // those arguments. If the queue is empty this will still trigger work to be done
    concatMap(async (set: Set<T>) => {
      closeSleepPerf();
      return mapResult<H, Error, Result<H, PollingError<T>>>(
        await promiseResult<H, Error>(
          timeoutPromiseAfter<H, Error>(
            work(...pullFromSet(set, getCapacity())),
            workTimeout ?? pollInterval,
            () => new Error(`work has timed out`)
          )
        ),
        (workResult) => asOk(workResult),
        (err: Error) => asPollingError<T>(err, PollingErrorType.WorkError)
      );
    }),
    tap(openSleepPerf),
    // catch errors during polling for work
    catchError((err: Error) => of(asPollingError<T>(err, PollingErrorType.WorkError)))
  );

  return merge(requestWorkProcessing$, errors$);
}
/**
 * Unwraps optional values and pushes them into a set
 * @param set A Set of generic type T
 * @param maxCapacity How many values are we allowed to push into the set
 * @param value An optional T to push into the set if it is there
 */
function pushOptionalIntoSet<T>(
  set: Set<T>,
  maxCapacity: number,
  value: Option<T>
): Result<Set<T>, Set<T>> {
  return pipe(
    value,
    mapOptional<T, Result<Set<T>, Set<T>>>((req) => {
      if (set.size >= maxCapacity) {
        return asErr(set);
      }
      set.add(req);
      return asOk(set);
    }),
    getOrElse(() => asOk(set) as Result<Set<T>, Set<T>>)
  );
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

const openSleepPerf = () => {
  performance.mark('TaskPoller.sleep');
};
// we only want to close after an open has been called, as we're counting the time *between* work cycles
// so we'll ignore the first call to `closeSleepPerf` but we will run every subsequent call
const closeSleepPerf = after(2, () => {
  performance.mark('TaskPoller.poll');
  performance.measure('TaskPoller.sleepDuration', 'TaskPoller.sleep', 'TaskPoller.poll');
});
