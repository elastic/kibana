/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/data-plugin/common';
import { FactoryQueryTypes } from '../..';

import { ESQuery } from '../../../../typed_json';
import { Inspect, Maybe, SortField, TimerangeInput } from '../../../common';

export interface RiskScoreRequestOptions extends IEsSearchRequest {
  defaultIndex: string[];
  factoryQueryType?: FactoryQueryTypes;
  timerange?: TimerangeInput;
  onlyLatest?: boolean;
  pagination?: {
    cursorStart: number;
    querySize: number;
  };
  sort?: RiskScoreSortField;
  filterQuery?: ESQuery | string | undefined;
}

export interface RiskScoreStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  totalCount: number;
}

export interface RiskScore {
  '@timestamp': string;
  risk: string;
  risk_stats: {
    rule_risks: RuleRisk[];
    risk_score: number;
  };
}

export interface HostsRiskScore extends RiskScore {
  host: {
    name: string;
  };
}

export interface UsersRiskScore extends RiskScore {
  user: {
    name: string;
  };
}

export interface RuleRisk {
  rule_name: string;
  rule_risk: number;
  rule_id: string;
}

export type RiskScoreSortField = SortField<RiskScoreFields>;

export const enum RiskScoreFields {
  timestamp = '@timestamp',
  hostName = 'host.name',
  userName = 'user.name',
  riskScore = 'risk_stats.risk_score',
  risk = 'risk',
}

export interface RiskScoreItem {
  _id?: Maybe<string>;
  [RiskScoreFields.hostName]: Maybe<string>;
  [RiskScoreFields.userName]: Maybe<string>;
  [RiskScoreFields.risk]: Maybe<RiskSeverity>;
  [RiskScoreFields.riskScore]: Maybe<number>;
}

export const enum RiskSeverity {
  unknown = 'Unknown',
  low = 'Low',
  moderate = 'Moderate',
  high = 'High',
  critical = 'Critical',
}
