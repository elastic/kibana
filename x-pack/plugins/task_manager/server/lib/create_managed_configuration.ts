/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { interval, merge, of, Observable } from 'rxjs';
import { filter, mergeScan, map, scan, distinctUntilChanged, startWith } from 'rxjs/operators';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';
import { isEsCannotExecuteScriptError } from './identify_es_error';

const FLUSH_MARKER = Symbol('flush');
export const ADJUST_THROUGHPUT_INTERVAL = 10 * 1000;

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
  logger: Logger;
  startingMaxWorkers: number;
  startingPollInterval: number;
  errors$: Observable<Error>;
}

export interface ManagedConfiguration {
  maxWorkersConfiguration$: Observable<number>;
  pollIntervalConfiguration$: Observable<number>;
}

export function createManagedConfiguration({
  logger,
  startingMaxWorkers,
  startingPollInterval,
  errors$,
}: ManagedConfigurationOpts): ManagedConfiguration {
  const errorCheck$ = countErrors(errors$, ADJUST_THROUGHPUT_INTERVAL);
  return {
    maxWorkersConfiguration$: errorCheck$.pipe(
      createMaxWorkersScan(logger, startingMaxWorkers),
      startWith(startingMaxWorkers),
      distinctUntilChanged()
    ),
    pollIntervalConfiguration$: errorCheck$.pipe(
      createPollIntervalScan(logger, startingPollInterval),
      startWith(startingPollInterval),
      distinctUntilChanged()
    ),
  };
}

function createMaxWorkersScan(logger: Logger, startingMaxWorkers: number) {
  return scan((previousMaxWorkers: number, errorCount: number) => {
    let newMaxWorkers: number;
    if (errorCount > 0) {
      // Decrease max workers by MAX_WORKERS_DECREASE_PERCENTAGE while making sure it doesn't go lower than 1.
      // Using Math.floor to make sure the number is different than previous while not being a decimal value.
      newMaxWorkers = Math.max(Math.floor(previousMaxWorkers * MAX_WORKERS_DECREASE_PERCENTAGE), 1);
    } else {
      // Increase max workers by MAX_WORKERS_INCREASE_PERCENTAGE while making sure it doesn't go
      // higher than the starting value. Using Math.ceil to make sure the number is different than
      // previous while not being a decimal value
      newMaxWorkers = Math.min(
        startingMaxWorkers,
        Math.ceil(previousMaxWorkers * MAX_WORKERS_INCREASE_PERCENTAGE)
      );
    }
    if (newMaxWorkers !== previousMaxWorkers) {
      logger.debug(
        `Max workers configuration changing from ${previousMaxWorkers} to ${newMaxWorkers} after seeing ${errorCount} "too many request" and/or "execute [inline] script" error(s)`
      );
      if (previousMaxWorkers === startingMaxWorkers) {
        logger.warn(
          `Max workers configuration is temporarily reduced after Elasticsearch returned ${errorCount} "too many request" and/or "execute [inline] script" error(s).`
        );
      }
    }
    return newMaxWorkers;
  }, startingMaxWorkers);
}

function createPollIntervalScan(logger: Logger, startingPollInterval: number) {
  return scan((previousPollInterval: number, errorCount: number) => {
    let newPollInterval: number;
    if (errorCount > 0) {
      // Increase poll interval by POLL_INTERVAL_INCREASE_PERCENTAGE and use Math.ceil to
      // make sure the number is different than previous while not being a decimal value.
      newPollInterval = Math.ceil(previousPollInterval * POLL_INTERVAL_INCREASE_PERCENTAGE);
    } else {
      // Decrease poll interval by POLL_INTERVAL_DECREASE_PERCENTAGE and use Math.floor to
      // make sure the number is different than previous while not being a decimal value.
      newPollInterval = Math.max(
        startingPollInterval,
        Math.floor(previousPollInterval * POLL_INTERVAL_DECREASE_PERCENTAGE)
      );
    }
    if (newPollInterval !== previousPollInterval) {
      logger.debug(
        `Poll interval configuration changing from ${previousPollInterval} to ${newPollInterval} after seeing ${errorCount} "too many request" and/or "execute [inline] script" error(s)`
      );
      if (previousPollInterval === startingPollInterval) {
        logger.warn(
          `Poll interval configuration is temporarily increased after Elasticsearch returned ${errorCount} "too many request" and/or "execute [inline] script" error(s).`
        );
      }
    }
    return newPollInterval;
  }, startingPollInterval);
}

function countErrors(errors$: Observable<Error>, countInterval: number): Observable<number> {
  return merge(
    // Flush error count at fixed interval
    interval(countInterval).pipe(map(() => FLUSH_MARKER)),
    errors$.pipe(
      filter(
        (e) => SavedObjectsErrorHelpers.isTooManyRequestsError(e) || isEsCannotExecuteScriptError(e)
      )
    )
  ).pipe(
    // When tag is "flush", reset the error counter
    // Otherwise increment the error counter
    mergeScan(({ count }, next) => {
      return next === FLUSH_MARKER
        ? of(emitErrorCount(count), resetErrorCount())
        : of(incementErrorCount(count));
    }, emitErrorCount(0)),
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
