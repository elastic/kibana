/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Maybe, RiskSeverity } from '../../..';
import { HostEcs } from '../../../../ecs/host';
import { UserEcs } from '../../../../ecs/user';

export const enum UserRiskScoreFields {
  timestamp = '@timestamp',
  userName = 'user.name',
  riskScore = 'risk_stats.risk_score',
  risk = 'risk',
}

export interface UserRiskScoreItem {
  _id?: Maybe<string>;
  [UserRiskScoreFields.userName]: Maybe<string>;
  [UserRiskScoreFields.risk]: Maybe<RiskSeverity>;
  [UserRiskScoreFields.riskScore]: Maybe<number>;
}

export interface UserItem {
  user?: Maybe<UserEcs>;
  host?: Maybe<HostEcs>;
  lastSeen?: Maybe<string>;
  firstSeen?: Maybe<string>;
}

export enum UsersFields {
  lastSeen = 'lastSeen',
  hostName = 'userName',
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
