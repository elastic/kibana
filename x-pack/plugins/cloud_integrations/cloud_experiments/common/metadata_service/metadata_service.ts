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
  map,
} from 'rxjs';
import { type Duration } from 'moment';
import type { Logger } from '@kbn/logging';
import type { BuildFlavor } from '@kbn/config';
import type { EvaluationContext } from '@kbn/core-feature-flags-browser';
import { removeUndefined } from './remove_undefined';

export interface MetadataServiceStartContract {
  hasDataFetcher: () => Promise<{ has_data: boolean }>;
}

export interface FlatMetadata {
  // Static values
  /**
   * The deployment/project ID
   * @group Kibana Static Values
   */
  instanceKey?: string;
  /**
   * The offering (serverless/traditional)
   * @group Kibana Static Values
   */
  offering: BuildFlavor;
  /**
   * The Kibana version
   * @group Kibana Static Values
   */
  version: string;
  /**
   * The Kibana build number
   * @group Kibana Static Values
   */
  build_num: number;
  /**
   * The Kibana build sha
   * @group Kibana Static Values
   */
  build_sha: string;
  /**
   * The Kibana build sha (short format)
   * @group Kibana Static Values
   */
  build_sha_short: string;
  /**
   * The Serverless project type (only available on serverless)
   * @group Kibana Static Values
   */
  project_type?: string;
  /**
   * Whether this is a canary or non-canary project/deployment
   * @group Kibana Static Values
   */
  orchestrator_target?: string;
  /**
   * The Elastic Cloud Organization's ID
   * @group Organization Static Values
   */
  organizationKey?: string;
  /**
   * The Elastic Cloud Organization's trial end date.
   * @group Organization Static Values
   */
  trial_end_date?: Date;
  /**
   * Is the Elastic Cloud Organization owned by an Elastician.
   * @group Organization Static Values
   */
  is_elastic_staff?: boolean;

  // Dynamic/calculated values
  /**
   * Is the Elastic Cloud Organization in trial.
   * @group Organization Dynamic Values
   */
  in_trial?: boolean;
  /**
   * Does the deployment/project have any data ingested?
   * @group Kibana Dynamic Values
   */
  has_data?: boolean;
}

export interface MetadataServiceConfig {
  metadata_refresh_interval: Duration;
}

export class MetadataService {
  private readonly _userMetadata$ = new BehaviorSubject<FlatMetadata | undefined>(undefined);
  private readonly stop$ = new Subject<void>();

  constructor(private readonly config: MetadataServiceConfig, private readonly logger: Logger) {}

  public setup(initialUserMetadata: FlatMetadata) {
    this._userMetadata$.next(initialUserMetadata);

    // Calculate `inTrial` based on the `trialEndDate`.
    // Elastic Cloud allows customers to end their trials earlier or even extend it in some cases, but this is a good compromise for now.
    const trialEndDate = initialUserMetadata.trial_end_date;
    if (trialEndDate) {
      this.scheduleUntil(
        () => ({ in_trial: Date.now() <= new Date(trialEndDate).getTime() }),
        // Stop recalculating inTrial when the user is no-longer in trial
        (metadata) => metadata.in_trial === false
      );
    }
  }

  public get userMetadata$(): Observable<EvaluationContext> {
    return this._userMetadata$.pipe(
      filter(Boolean), // Ensure we don't return undefined
      debounceTime(100), // Swallows multiple emissions that may occur during bootstrap
      distinct((meta) => [meta.in_trial, meta.has_data].join('-')), // Checks if any of the dynamic fields have changed
      map((metadata) => {
        const context: EvaluationContext = {
          kind: 'multi',
          ...(metadata.instanceKey && {
            kibana: removeUndefined({
              key: metadata.instanceKey,
              offering: metadata.offering,
              version: metadata.version,
              build_num: metadata.build_num,
              build_sha: metadata.build_sha,
              build_sha_short: metadata.build_sha_short,
              project_type: metadata.project_type,
              orchestrator_target: metadata.orchestrator_target,
              has_data: metadata.has_data,
            }),
          }),
          ...(metadata.organizationKey && {
            organization: removeUndefined({
              key: metadata.organizationKey,
              is_elastic_staff: metadata.is_elastic_staff,
              in_trial: metadata.in_trial,
              trial_end_date: metadata.trial_end_date,
            }),
          }),
        };
        return context;
      }),
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
   * Schedules a timer that calls `fn` to update the {@link FlatMetadata} until `untilFn` returns true.
   * @param fn Method to calculate the dynamic metadata.
   * @param untilFn Method that returns true when the scheduler should stop calling fn (potentially because the dynamic value is not expected to change anymore).
   * @private
   */
  private scheduleUntil(
    fn: () => Partial<FlatMetadata> | Promise<Partial<FlatMetadata>>,
    untilFn: (value: FlatMetadata) => boolean
  ) {
    timer(0, this.config.metadata_refresh_interval.asMilliseconds())
      .pipe(
        takeUntil(this.stop$),
        exhaustMap(async () => {
          try {
            this._userMetadata$.next({
              ...this._userMetadata$.value!, // We are running the schedules after the initial user metadata is set
              ...(await fn()),
            });
          } catch (err) {
            this.logger.warn(`Failed to update metadata because ${err}`);
          }
        }),
        takeWhile(() => {
          return !untilFn(this._userMetadata$.value!);
        })
      )
      .subscribe();
  }
}
