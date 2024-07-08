/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';

import { EntityRiskLevels, EntityRiskLevelsEnum } from '../../../../api/entity_analytics/common';
import type { EntityRiskScoreRecord } from '../../../../api/entity_analytics/common';
import type { Inspect, Maybe, SortField } from '../../../common';

export interface HostsRiskScoreStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  totalCount: number;
  data: HostRiskScore[] | undefined;
}

export interface UsersRiskScoreStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  totalCount: number;
  data: UserRiskScore[] | undefined;
}

export interface RiskStats extends EntityRiskScoreRecord {
  rule_risks: RuleRisk[];
  multipliers: string[];
}

export const RiskSeverity = EntityRiskLevels.enum;
export type RiskSeverity = EntityRiskLevels;

export interface HostRiskScore {
  '@timestamp': string;
  host: {
    name: string;
    risk: RiskStats;
  };
  alertsCount?: number;
  oldestAlertTimestamp?: string;
}

export interface UserRiskScore {
  '@timestamp': string;
  user: {
    name: string;
    risk: RiskStats;
  };
  alertsCount?: number;
  oldestAlertTimestamp?: string;
}

export interface RuleRisk {
  rule_name: string;
  rule_risk: number;
  rule_id: string;
}

export type RiskScoreSortField = SortField<RiskScoreFields>;

export enum RiskScoreFields {
  timestamp = '@timestamp',
  hostName = 'host.name',
  hostRiskScore = 'host.risk.calculated_score_norm',
  hostRisk = 'host.risk.calculated_level',
  userName = 'user.name',
  userRiskScore = 'user.risk.calculated_score_norm',
  userRisk = 'user.risk.calculated_level',
  alertsCount = 'alertsCount',
}

export interface RiskScoreItem {
  _id?: Maybe<string>;
  [RiskScoreFields.hostName]: Maybe<string>;
  [RiskScoreFields.userName]: Maybe<string>;

  [RiskScoreFields.timestamp]: Maybe<string>;

  [RiskScoreFields.hostRisk]: Maybe<EntityRiskLevels>;
  [RiskScoreFields.userRisk]: Maybe<EntityRiskLevels>;

  [RiskScoreFields.hostRiskScore]: Maybe<number>;
  [RiskScoreFields.userRiskScore]: Maybe<number>;

  [RiskScoreFields.alertsCount]: Maybe<number>;
}

export const isUserRiskScore = (risk: HostRiskScore | UserRiskScore): risk is UserRiskScore =>
  'user' in risk;

export const EMPTY_SEVERITY_COUNT = {
  [EntityRiskLevelsEnum.Critical]: 0,
  [EntityRiskLevelsEnum.High]: 0,
  [EntityRiskLevelsEnum.Low]: 0,
  [EntityRiskLevelsEnum.Moderate]: 0,
  [EntityRiskLevelsEnum.Unknown]: 0,
};
