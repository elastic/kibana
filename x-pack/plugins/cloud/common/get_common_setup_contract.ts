/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { inTrialObservable } from './in_trial_observable';
import { isPayingObservable } from './is_paying_observable';

export interface CloudCommonSetupContract {
  /**
   * Cloud ID. Undefined if not running on Cloud.
   */
  cloudId?: string;
  /**
   * `true` if the Elastic Cloud organization that owns this deployment is owned by an Elastician. Only available when running on Elastic Cloud.
   */
  isElasticStaffOwned?: boolean;
  /**
   * When the Cloud Trial ends/ended for the organization that owns this deployment. Only available when running on Elastic Cloud.
   */
  trialEndDate?: Date;
  /**
   * Observable indicating whether the Cloud Organization is still in trial
   */
  inTrial$?: Observable<boolean>;
  /**
   * Observable indicating whether the Cloud Organization is a paying customer
   */
  isPaying$?: Observable<boolean>;
  /**
   * When the Cloud Organization was created on Elastic Cloud. Only available when running on Elastic Cloud.
   */
  organizationCreatedAt?: Date;
}

export interface CommonSetupConfig {
  id?: string;
  is_elastic_staff_owned?: boolean;
  trial_end_date?: string;
  organization_created_at?: string;
}

export function getCommonSetupContract(config: CommonSetupConfig): CloudCommonSetupContract {
  const cloudId = config.id;
  const isElasticStaffOwned = config.is_elastic_staff_owned;
  const organizationCreatedAt = config.organization_created_at
    ? new Date(config.organization_created_at)
    : undefined;
  const trialEndDate = config.trial_end_date ? new Date(config.trial_end_date) : undefined;
  const inTrial$ = trialEndDate ? inTrialObservable(trialEndDate) : undefined;
  const isPaying$ =
    inTrial$ && typeof isElasticStaffOwned !== 'undefined'
      ? isPayingObservable({ inTrial$, isElasticStaffOwned })
      : undefined;

  return {
    cloudId,
    isElasticStaffOwned,
    trialEndDate,
    inTrial$,
    isPaying$,
    organizationCreatedAt,
  };
}
