/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FactoryQueryTypes } from '..';
import type {
  IEsSearchRequest,
  IEsSearchResponse,
} from '../../../../../../../src/plugins/data/common';
import { RISKY_HOSTS_INDEX_PREFIX, RISKY_USERS_INDEX_PREFIX } from '../../../constants';
import { ESQuery } from '../../../typed_json';
import { Inspect, Maybe, SortField, TimerangeInput } from '../../common';

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
  rule_id?: string; // TODO Remove the '?' when the new transform is delivered
}

export const getHostRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return `${RISKY_HOSTS_INDEX_PREFIX}${onlyLatest ? 'latest_' : ''}${spaceId}`;
};

export const getUserRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return `${RISKY_USERS_INDEX_PREFIX}${onlyLatest ? 'latest_' : ''}${spaceId}`;
};

export const buildHostNamesFilter = (hostNames: string[]) => {
  return { terms: { 'host.name': hostNames } };
};

export type RiskScoreSortField = SortField<RiskScoreFields>;

export enum RiskQueries {
  riskScore = 'riskScore',
}

export const enum RiskScoreFields {
  timestamp = '@timestamp',
  hostName = 'host.name',
  userName = 'user.name',
  riskScore = 'risk_stats.risk_score',
  risk = 'risk',
  // TODO: Steph/Host Risk
  // ruleRisks = 'rule_risks',
}

export interface RiskScoreItem {
  _id?: Maybe<string>;
  [RiskScoreFields.hostName]: Maybe<string>;
  [RiskScoreFields.userName]: Maybe<string>;
  [RiskScoreFields.risk]: Maybe<RiskSeverity>;
  [RiskScoreFields.riskScore]: Maybe<number>;
  // TODO: Steph/Host Risk
  // [RiskScoreFields.ruleRisks]: Maybe<RuleRisk[]>;
}

export const enum RiskSeverity {
  unknown = 'Unknown',
  low = 'Low',
  moderate = 'Moderate',
  high = 'High',
  critical = 'Critical',
}
