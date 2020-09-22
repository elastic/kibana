/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { interval, merge, of, BehaviorSubject, Observable, Subscription } from 'rxjs';
import { filter, mergeScan, map } from 'rxjs/operators';
import { Logger } from '../types';
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

interface DynamicConfiguration<T> {
  startingValue: T;
  currentValue: T;
  observable$: BehaviorSubject<T>;
}

interface ThroughputManagerOpts {
  maxWorkers$: BehaviorSubject<number>;
  pollInterval$: BehaviorSubject<number>;
  startingMaxWorkers: number;
  startingPollInterval: number;
  errors$: Observable<Error>;
  logger: Logger;
}

export class ThroughputManager {
  private throughputCheckSubcription?: Subscription;
  private readonly throughputCheck$: Observable<number>;
  private readonly logger: Logger;
  private readonly maxWorkers: DynamicConfiguration<number>;
  private readonly pollInterval: DynamicConfiguration<number>;
  private readonly errors$: Observable<Error>;

  constructor(opts: ThroughputManagerOpts) {
    this.logger = opts.logger;
    this.errors$ = opts.errors$;
    this.maxWorkers = {
      startingValue: opts.startingMaxWorkers,
      currentValue: opts.startingMaxWorkers,
      observable$: opts.maxWorkers$,
    };
    this.pollInterval = {
      startingValue: opts.startingPollInterval,
      currentValue: opts.startingPollInterval,
      observable$: opts.pollInterval$,
    };
    // Count the number of errors from errors$ and reset whenever throughputCheckInterval$ flushes it
    this.throughputCheck$ = merge(
      // Flush error count at fixed interval
      interval(ADJUST_THROUGHPUT_INTERVAL).pipe(map(() => FLUSH_MARKER)),
      this.errors$.pipe(filter((e) => SavedObjectsErrorHelpers.isTooManyRequestsError(e)))
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

  public get isStarted() {
    return this.throughputCheckSubcription && !this.throughputCheckSubcription.closed;
  }

  public start() {
    if (!this.isStarted) {
      this.throughputCheckSubcription = this.throughputCheck$.subscribe((errorCount) => {
        if (errorCount > 0) {
          this.reduceThroughput(errorCount);
          return;
        }
        this.increaseThroughput();
      });
    }
  }

  public stop() {
    this.throughputCheckSubcription?.unsubscribe();
    // Reset observable values to original values
    this.updateConfiguration(this.maxWorkers.startingValue, this.pollInterval.startingValue);
  }
  private reduceThroughput(errorCount: number) {
    const newMaxWorkers = Math.max(
      Math.floor(this.maxWorkers.currentValue * MAX_WORKERS_DECREASE_PERCENTAGE),
      1
    );
    const newPollInterval = Math.ceil(
      this.pollInterval.currentValue * POLL_INTERVAL_INCREASE_PERCENTAGE
    );
    this.logger.info(
      `Throughput reduced after seeing ${errorCount} error(s): maxWorkers: ${this.maxWorkers.currentValue}->${newMaxWorkers}, pollInterval: ${this.pollInterval.currentValue}->${newPollInterval}`
    );
    this.updateConfiguration(newMaxWorkers, newPollInterval);
  }

  private increaseThroughput() {
    const newMaxWorkers = Math.min(
      this.maxWorkers.startingValue,
      Math.ceil(this.maxWorkers.currentValue * MAX_WORKERS_INCREASE_PERCENTAGE + 1)
    );
    const newPollInterval = Math.max(
      this.pollInterval.startingValue,
      Math.floor(this.pollInterval.currentValue * POLL_INTERVAL_DECREASE_PERCENTAGE - 1)
    );
    if (
      newMaxWorkers !== this.maxWorkers.currentValue ||
      newPollInterval !== this.pollInterval.currentValue
    ) {
      this.logger.info(
        `Throughput increasing after seeing no errors: maxWorkers: ${this.maxWorkers.currentValue}->${newMaxWorkers}, pollInterval: ${this.pollInterval.currentValue}->${newPollInterval}`
      );
    }
    this.updateConfiguration(newMaxWorkers, newPollInterval);
  }

  private updateConfiguration(newMaxWorkers: number, newPollInterval: number) {
    if (this.maxWorkers.currentValue !== newMaxWorkers) {
      this.maxWorkers.currentValue = newMaxWorkers;
      this.maxWorkers.observable$.next(newMaxWorkers);
    }
    if (this.pollInterval.currentValue !== newPollInterval) {
      this.pollInterval.currentValue = newPollInterval;
      this.pollInterval.observable$.next(newPollInterval);
    }
  }
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
