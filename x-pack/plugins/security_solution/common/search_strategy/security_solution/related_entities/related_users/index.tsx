/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { RiskSeverity, Inspect, Maybe } from '../../..';
import type { RequestBasicOptions } from '../..';
import type { BucketItem } from '../../cti';

export interface RelatedUser {
  user: string;
  ip: string[];
  risk?: RiskSeverity;
}

export interface RelatedUserBucket {
  key: string;
  doc_count: number;
  ip?: IPItems;
}

interface IPItems {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: BucketItem[];
}

export interface HostsRelatedUsersStrategyResponse extends IEsSearchResponse {
  totalCount: number;
  relatedUsers: RelatedUser[];
  inspect?: Maybe<Inspect>;
}

export interface HostsRelatedUsersRequestOptions extends Partial<RequestBasicOptions> {
  hostName: string;
  skip?: boolean;
  from: string;
  inspect?: Maybe<Inspect>;
  isNewRiskScoreModuleAvailable: boolean;
}
