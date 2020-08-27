/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';

const THROUGHPUT_CHECK_INTERVAL = 10 * 1000;
const MAX_WORKERS_REDUCTION_PERCENTAGE = 0.8;
const MAX_WORKERS_INCREASE_PERCENTAGE = 1.05;
const POLL_INTERVAL_REDUCTION_PERCENTAGE = 0.95;
const POLL_INTERVAL_INCREASE_PERCENTAGE = 1.2;

export class ThroughputManager {
  private isStarted: boolean = false;
  private readonly maxWorkers$: BehaviorSubject<number>;
  private readonly pollInterval$: BehaviorSubject<number>;
  private readonly startingMaxWorkers: number;
  private readonly startingPollInterval: number;
  private currentMaxWorkers: number;
  private currentPollInterval: number;
  private readonly storeErrors$: Observable<Error>;
  private storeErrorsSubscription?: Subscription;
  private errorCountSinceLastInterval: number = 0;
  private throughputCheckIntervalId?: NodeJS.Timeout;

  constructor(opts: {
    maxWorkers$: BehaviorSubject<number>;
    pollInterval$: BehaviorSubject<number>;
    startingMaxWorkers: number;
    startingPollInterval: number;
    storeErrors$: Observable<Error>;
  }) {
    this.maxWorkers$ = opts.maxWorkers$;
    this.pollInterval$ = opts.pollInterval$;
    this.startingMaxWorkers = opts.startingMaxWorkers;
    this.startingPollInterval = opts.startingPollInterval;
    this.storeErrors$ = opts.storeErrors$;

    this.currentMaxWorkers = this.startingMaxWorkers;
    this.currentPollInterval = this.startingPollInterval;
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
    const newMaxWorkers =
      this.errorCountSinceLastInterval > 0
        ? this.currentMaxWorkers * MAX_WORKERS_REDUCTION_PERCENTAGE
        : Math.max(
            this.currentMaxWorkers * MAX_WORKERS_INCREASE_PERCENTAGE,
            this.startingMaxWorkers
          );
    const newPollInterval =
      this.errorCountSinceLastInterval > 0
        ? this.currentPollInterval * POLL_INTERVAL_INCREASE_PERCENTAGE
        : Math.min(
            this.currentPollInterval * POLL_INTERVAL_REDUCTION_PERCENTAGE,
            this.startingPollInterval
          );
    if (newMaxWorkers !== this.currentMaxWorkers) {
      console.log(
        `Throughput manager changing max workers from ${this.currentMaxWorkers} to ${newMaxWorkers}`
      );
      this.maxWorkers$.next(newMaxWorkers);
      this.currentMaxWorkers = newMaxWorkers;
    }
    if (newPollInterval !== this.currentPollInterval) {
      console.log(
        `Throughput manager changing poll interval from ${this.currentPollInterval} to ${newPollInterval}`
      );
      this.pollInterval$.next(newPollInterval);
      this.currentPollInterval = newPollInterval;
    }
    this.errorCountSinceLastInterval = 0;
  }
}
