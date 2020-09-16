/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Logger } from '../types';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';

const THROUGHPUT_CHECK_INTERVAL = 10 * 1000;

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
  private isStarted: boolean = false;
  private errorsSubscription?: Subscription;
  private errorCountSinceLastInterval: number = 0;
  private throughputCheckIntervalId?: NodeJS.Timeout;
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
  }

  public start() {
    if (!this.isStarted) {
      this.errorsSubscription = this.errors$.subscribe(this.storeErrorHandler.bind(this));
      this.throughputCheckIntervalId = setInterval(
        this.checkThroughput.bind(this),
        THROUGHPUT_CHECK_INTERVAL
      );
      this.isStarted = true;
    }
  }

  public stop() {
    this.errorsSubscription?.unsubscribe();
    if (this.throughputCheckIntervalId) {
      clearInterval(this.throughputCheckIntervalId);
    }
    delete this.errorsSubscription;
    delete this.throughputCheckIntervalId;
    // Reset observable values to original values
    this.updateConfiguration(this.maxWorkers.startingValue, this.pollInterval.startingValue);
    this.isStarted = false;
  }

  private storeErrorHandler(e: Error) {
    if (SavedObjectsErrorHelpers.isTooManyRequestsError(e)) {
      this.errorCountSinceLastInterval++;
    }
  }

  private checkThroughput() {
    if (this.errorCountSinceLastInterval > 0) {
      this.reduceThroughput();
    } else {
      this.increaseThroughput();
    }
    this.errorCountSinceLastInterval = 0;
  }

  private reduceThroughput() {
    const newMaxWorkers = Math.max(
      Math.floor(this.maxWorkers.currentValue * MAX_WORKERS_DECREASE_PERCENTAGE),
      1
    );
    const newPollInterval = Math.ceil(
      this.pollInterval.currentValue * POLL_INTERVAL_INCREASE_PERCENTAGE
    );
    this.logger.info(
      `Throughput reduced after seeing ${this.errorCountSinceLastInterval} error(s): maxWorkers: ${this.maxWorkers.currentValue}->${newMaxWorkers}, pollInterval: ${this.pollInterval.currentValue}->${newPollInterval}`
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
