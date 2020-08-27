/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Logger } from '../types';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';

const THROUGHPUT_CHECK_INTERVAL = 10 * 1000;
const MAX_WORKERS_REDUCTION_PERCENTAGE = 0.8;
const MAX_WORKERS_INCREASE_PERCENTAGE = 1.05;
const POLL_INTERVAL_REDUCTION_PERCENTAGE = 0.95;
const POLL_INTERVAL_INCREASE_PERCENTAGE = 1.2;

interface DynamicConfiguration<T> {
  startingValue: T;
  currentValue: T;
  observable$: BehaviorSubject<T>;
}

export class ThroughputManager {
  private isStarted: boolean = false;
  private storeErrorsSubscription?: Subscription;
  private errorCountSinceLastInterval: number = 0;
  private throughputCheckIntervalId?: NodeJS.Timeout;
  private readonly logger: Logger;
  private readonly maxWorkers: DynamicConfiguration<number>;
  private readonly pollInterval: DynamicConfiguration<number>;
  private readonly storeErrors$: Observable<Error>;

  constructor(opts: {
    maxWorkers$: BehaviorSubject<number>;
    pollInterval$: BehaviorSubject<number>;
    startingMaxWorkers: number;
    startingPollInterval: number;
    storeErrors$: Observable<Error>;
    logger: Logger;
  }) {
    this.logger = opts.logger;
    this.storeErrors$ = opts.storeErrors$;
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
    if (this.isStarted) {
      throw new Error('ThroughputManager already started');
    }
    this.storeErrorsSubscription = this.storeErrors$.subscribe(this.storeErrorHandler.bind(this));
    this.throughputCheckIntervalId = setInterval(
      this.checkThroughput.bind(this),
      THROUGHPUT_CHECK_INTERVAL
    );
    this.isStarted = true;
  }

  public stop() {
    if (this.storeErrorsSubscription) {
      this.storeErrorsSubscription.unsubscribe();
      delete this.storeErrorsSubscription;
    }
    if (this.throughputCheckIntervalId) {
      clearInterval(this.throughputCheckIntervalId);
      delete this.throughputCheckIntervalId;
    }
    this.isStarted = false;
  }

  private storeErrorHandler(e: Error) {
    if (SavedObjectsErrorHelpers.isTooManyRequestsError(e)) {
      this.errorCountSinceLastInterval++;
    }
  }

  private checkThroughput() {
    const newMaxWorkersMultiple =
      this.errorCountSinceLastInterval > 0
        ? MAX_WORKERS_REDUCTION_PERCENTAGE
        : MAX_WORKERS_INCREASE_PERCENTAGE;
    const newMaxWorkers = Math.max(
      this.maxWorkers.startingValue,
      this.maxWorkers.currentValue * newMaxWorkersMultiple
    );

    const newPollIntervalMultiple =
      this.errorCountSinceLastInterval > 0
        ? POLL_INTERVAL_INCREASE_PERCENTAGE
        : POLL_INTERVAL_REDUCTION_PERCENTAGE;
    const newPollInterval = Math.min(
      this.pollInterval.startingValue,
      this.pollInterval.currentValue * newPollIntervalMultiple
    );

    if (newMaxWorkers !== this.maxWorkers.currentValue) {
      this.logger.info(
        `Throughput manager changing max workers from ${this.maxWorkers.currentValue} to ${newMaxWorkers}`
      );
      this.maxWorkers.observable$.next(newMaxWorkers);
      this.maxWorkers.currentValue = newMaxWorkers;
    }

    if (newPollInterval !== this.pollInterval.currentValue) {
      this.logger.info(
        `Throughput manager changing poll interval from ${this.pollInterval.currentValue} to ${newPollInterval}`
      );
      this.pollInterval.observable$.next(newPollInterval);
      this.pollInterval.currentValue = newPollInterval;
    }

    this.errorCountSinceLastInterval = 0;
  }
}
