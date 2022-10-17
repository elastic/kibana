/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BehaviorSubject,
  debounceTime,
  distinct,
  exhaustMap,
  filter,
  type Observable,
  shareReplay,
  Subject,
  takeUntil,
  takeWhile,
  timer,
} from 'rxjs';
import { type Duration } from 'moment';

export interface MetadataServiceStartContract {
  hasDataFetcher: () => Promise<{ has_data: boolean }>;
}

export interface UserMetadata extends Record<string, string | boolean | number | undefined> {
  // Static values
  userId: string;
  kibanaVersion: string;
  trial_end_date?: string;
  is_elastic_staff_owned?: boolean;
  // Dynamic/calculated values
  in_trial?: boolean;
  has_data?: boolean;
}

export interface MetadataServiceConfig {
  metadata_refresh_interval: Duration;
}

export class MetadataService {
  private readonly _userMetadata$ = new BehaviorSubject<UserMetadata | undefined>(undefined);
  private readonly stop$ = new Subject<void>();

  constructor(private readonly config: MetadataServiceConfig) {}

  public setup(initialUserMetadata: UserMetadata) {
    this._userMetadata$.next(initialUserMetadata);

    // Calculate `in_trial` based on the `trial_end_date`.
    // Elastic Cloud allows customers to end their trials earlier or even extend it in some cases, but this is a good compromise for now.
    const trialEndDate = initialUserMetadata.trial_end_date;
    if (trialEndDate) {
      this.scheduleUntil(
        () => ({ in_trial: Date.now() <= new Date(trialEndDate).getTime() }),
        // Stop recalculating in_trial when the user is no-longer in trial
        (metadata) => metadata.in_trial === false
      );
    }
  }

  public get userMetadata$(): Observable<UserMetadata> {
    return this._userMetadata$.pipe(
      filter(Boolean), // Ensure we don't return undefined
      debounceTime(100), // Swallows multiple emissions that may occur during bootstrap
      distinct((meta) => [meta.in_trial, meta.has_data].join('-')), // Checks if any of the dynamic fields have changed
      shareReplay(1)
    );
  }

  public start({ hasDataFetcher }: MetadataServiceStartContract) {
    // If no initial metadata (setup was not called) => it should not schedule any metadata extension
    if (!this._userMetadata$.value) return;

    this.scheduleUntil(
      async () => hasDataFetcher(),
      // Stop checking the moment the user has any data
      (metadata) => metadata.has_data === true
    );
  }

  public stop() {
    this.stop$.next();
    this._userMetadata$.complete();
  }

  /**
   * Schedules a timer that calls `fn` to update the {@link UserMetadata} until `untilFn` returns true.
   * @param fn Method to calculate the dynamic metadata.
   * @param untilFn Method that returns true when the scheduler should stop calling fn (potentially because the dynamic value is not expected to change anymore).
   * @private
   */
  private scheduleUntil(
    fn: () => Partial<UserMetadata> | Promise<Partial<UserMetadata>>,
    untilFn: (value: UserMetadata) => boolean
  ) {
    timer(0, this.config.metadata_refresh_interval.asMilliseconds())
      .pipe(
        takeUntil(this.stop$),
        exhaustMap(async () => {
          this._userMetadata$.next({
            ...this._userMetadata$.value!, // We are running the schedules after the initial user metadata is set
            ...(await fn()),
          });
        }),
        takeWhile(() => {
          return !untilFn(this._userMetadata$.value!);
        })
      )
      .subscribe();
  }
}
