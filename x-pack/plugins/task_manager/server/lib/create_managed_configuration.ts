/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { interval, merge, of, Observable } from 'rxjs';
import { filter, mergeScan, map, scan, distinctUntilChanged, startWith } from 'rxjs/operators';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';

const FLUSH_MARKER: string = 'FLUSH';
const ADJUST_THROUGHPUT_INTERVAL = 10 * 1000;

// When errors occur, reduce maxWorkers by MAX_WORKERS_DECREASE_PERCENTAGE
// When errors no longer occur, start increasing maxWorkers by MAX_WORKERS_INCREASE_PERCENTAGE
// until starting value is reached
const MAX_WORKERS_DECREASE_PERCENTAGE = 0.8;
const MAX_WORKERS_INCREASE_PERCENTAGE = 1.05;

// When errors occur, increase pollInterval by POLL_INTERVAL_INCREASE_PERCENTAGE
// When errors no longer occur, start decreasing pollInterval by POLL_INTERVAL_DECREASE_PERCENTAGE
// until starting value is reached
const POLL_INTERVAL_DECREASE_PERCENTAGE = 0.95;
const POLL_INTERVAL_INCREASE_PERCENTAGE = 1.2;

interface ManagedConfigurationOpts {
  startingMaxWorkers: number;
  startingPollInterval: number;
  errors$: Observable<Error>;
}

interface ManagedConfiguration {
  maxWorkersConfiguration$: Observable<number>;
  pollIntervalConfiguration$: Observable<number>;
}

export function createManagedConfiguration(opts: ManagedConfigurationOpts): ManagedConfiguration {
  const errorCheck$ = countErrors(opts.errors$, ADJUST_THROUGHPUT_INTERVAL);

  return {
    maxWorkersConfiguration$: errorCheck$.pipe(
      scan((previousMaxWorkers, errorCount) => {
        if (errorCount > 0) {
          return Math.max(Math.floor(previousMaxWorkers * MAX_WORKERS_DECREASE_PERCENTAGE), 1);
        }
        return Math.min(
          opts.startingMaxWorkers,
          Math.ceil(previousMaxWorkers * MAX_WORKERS_INCREASE_PERCENTAGE + 1)
        );
      }, opts.startingMaxWorkers),
      startWith(opts.startingMaxWorkers),
      distinctUntilChanged()
    ),
    pollIntervalConfiguration$: errorCheck$.pipe(
      scan((previousPollInterval, errorCount) => {
        if (errorCount > 0) {
          return Math.ceil(previousPollInterval * POLL_INTERVAL_INCREASE_PERCENTAGE);
        }
        return Math.max(
          opts.startingPollInterval,
          Math.floor(previousPollInterval * POLL_INTERVAL_DECREASE_PERCENTAGE - 1)
        );
      }, opts.startingPollInterval),
      startWith(opts.startingPollInterval),
      distinctUntilChanged()
    ),
  };
}

function countErrors(errors$: Observable<Error>, countInterval: number): Observable<number> {
  return merge(
    // Flush error count at fixed interval
    interval(countInterval).pipe(map(() => FLUSH_MARKER)),
    errors$.pipe(filter((e) => SavedObjectsErrorHelpers.isTooManyRequestsError(e)))
  ).pipe(
    // When tag is "flush", reset the error counter
    // Otherwise increment the error counter
    mergeScan(
      ({ count }, next) =>
        next === FLUSH_MARKER
          ? of(emitErrorCount(count), resetErrorCount())
          : of(incementErrorCount(count)),
      emitErrorCount(0)
    ),
    filter(isEmitEvent),
    map(({ count }) => count)
  );
}

function emitErrorCount(count: number) {
  return {
    tag: 'emit',
    count,
  };
}

function isEmitEvent(event: { tag: string; count: number }) {
  return event.tag === 'emit';
}

function incementErrorCount(count: number) {
  return {
    tag: 'inc',
    count: count + 1,
  };
}

function resetErrorCount() {
  return {
    tag: 'initial',
    count: 0,
  };
}
