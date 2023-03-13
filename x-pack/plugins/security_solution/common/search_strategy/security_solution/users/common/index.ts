/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostEcs, UserEcs } from '@kbn/securitysolution-ecs';
import type { CommonFields, Maybe, RiskScoreFields, RiskSeverity, SortField } from '../../..';

export interface UserRiskScoreItem {
  _id?: Maybe<string>;
  [RiskScoreFields.userName]: Maybe<string>;
  [RiskScoreFields.userRisk]: Maybe<RiskSeverity>;
  [RiskScoreFields.userRiskScore]: Maybe<number>;
}

export interface UserItem {
  user?: Maybe<UserEcs>;
  host?: Maybe<HostEcs>;
  lastSeen?: Maybe<string>;
  firstSeen?: Maybe<string>;
}

export type SortableUsersFields = Exclude<UsersFields, typeof UsersFields.domain>;

export type SortUsersField = SortField<SortableUsersFields>;

export enum UsersFields {
  lastSeen = 'lastSeen',
  name = 'name',
  domain = 'domain',
}

export interface UserAggEsItem {
  user_id?: UserBuckets;
  user_domain?: UserBuckets;
  user_name?: UserBuckets;
  host_os_name?: UserBuckets;
  host_ip?: UserBuckets;
  host_os_family?: UserBuckets;
  first_seen?: { value_as_string: string };
  last_seen?: { value_as_string: string };
}

export interface UserBuckets {
  buckets: Array<{
    key: string;
    doc_count: number;
  }>;
}

export interface AllUsersAggEsItem {
  key: string;
  domain?: UsersDomainHitsItem;
  lastSeen?: { value_as_string: string };
}

type UserFields = CommonFields &
  Partial<{
    [Property in keyof UserEcs as `user.${Property}`]: unknown[];
  }>;

interface UsersDomainHitsItem {
  hits: {
    hits: Array<{
      fields: UserFields;
    }>;
  };
}
