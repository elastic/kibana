/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/data-plugin/common';
import type { ESQuery } from '../../../../typed_json';

import type { Inspect, Maybe, SortField, TimerangeInput } from '../../../common';
import type { RiskScoreEntity } from '../common';
import type { RiskInputs } from '../../../../risk_engine';

export interface RiskScoreRequestOptions extends IEsSearchRequest {
  defaultIndex: string[];
  riskScoreEntity: RiskScoreEntity;
  timerange?: TimerangeInput;
  alertsTimerange?: TimerangeInput;
  includeAlertsCount?: boolean;
  onlyLatest?: boolean;
  pagination?: {
    cursorStart: number;
    querySize: number;
  };
  sort?: RiskScoreSortField;
  filterQuery?: ESQuery | string | undefined;
}

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

export interface RiskStats {
  rule_risks: RuleRisk[];
  calculated_score_norm: number;
  multipliers: string[];
  calculated_level: RiskSeverity;
  inputs?: RiskInputs;
}

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

  [RiskScoreFields.hostRisk]: Maybe<RiskSeverity>;
  [RiskScoreFields.userRisk]: Maybe<RiskSeverity>;

  [RiskScoreFields.hostRiskScore]: Maybe<number>;
  [RiskScoreFields.userRiskScore]: Maybe<number>;

  [RiskScoreFields.alertsCount]: Maybe<number>;
}

export enum RiskSeverity {
  unknown = 'Unknown',
  low = 'Low',
  moderate = 'Moderate',
  high = 'High',
  critical = 'Critical',
}

export const isUserRiskScore = (risk: HostRiskScore | UserRiskScore): risk is UserRiskScore =>
  'user' in risk;

export const EMPTY_SEVERITY_COUNT = {
  [RiskSeverity.critical]: 0,
  [RiskSeverity.high]: 0,
  [RiskSeverity.low]: 0,
  [RiskSeverity.moderate]: 0,
  [RiskSeverity.unknown]: 0,
};

export const SEVERITY_UI_SORT_ORDER = [
  RiskSeverity.unknown,
  RiskSeverity.low,
  RiskSeverity.moderate,
  RiskSeverity.high,
  RiskSeverity.critical,
];
