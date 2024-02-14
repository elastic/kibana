/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleDomain } from '../../../application/rule/types';
import { AdHocRunStatus } from '../../../../common/constants';

export interface AdHocRunSchedule extends Record<string, unknown> {
  interval: string;
  status: AdHocRunStatus;
  runAt: string;
}

// This is the rule information stored in the AD_HOC_RUN_SAVED_OBJECT_TYPE saved object
// It does not include the rule ID because that is stored in the SO references array
type AdHocRunSORule = Pick<
  RuleDomain,
  | 'name'
  | 'tags'
  | 'alertTypeId'
  | 'params'
  | 'apiKeyOwner'
  | 'apiKeyCreatedByUser'
  | 'consumer'
  | 'enabled'
  | 'schedule'
  | 'createdBy'
  | 'updatedBy'
  | 'revision'
> & {
  createdAt: string;
  updatedAt: string;
};

// This is the rule information after loaded from persistence with the
// rule ID injected from the SO references array
type AdHocRunRule = AdHocRunSORule & Pick<RuleDomain, 'id'>;

export interface AdHocRunSO extends Record<string, unknown> {
  apiKeyId: string;
  apiKeyToUse: string;
  createdAt: string;
  duration: string;
  enabled: boolean;
  end?: string;
  rule: AdHocRunSORule;
  spaceId: string;
  start: string;
  status: AdHocRunStatus;
  schedule: AdHocRunSchedule[];
}

export type AdHocRun = Omit<AdHocRunSO, 'rule'> & { id: string; rule: AdHocRunRule };
