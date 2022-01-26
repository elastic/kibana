/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FactoryQueryTypes, RiskScoreBetterFields } from '../..';
import type {
  IEsSearchRequest,
  IEsSearchResponse,
} from '../../../../../../../../src/plugins/data/common';
import { RISKY_HOSTS_INDEX_PREFIX } from '../../../../constants';
import { ESQuery } from '../../../../typed_json';
import { Inspect, Maybe, SortField, TimerangeInput } from '../../../common';

export interface HostsRiskScoreRequestOptions extends IEsSearchRequest {
  defaultIndex: string[];
  factoryQueryType?: FactoryQueryTypes;
  hostNames?: string[];
  timerange?: TimerangeInput;
  onlyLatest?: boolean;
  pagination?: {
    cursorStart: number;
    querySize: number;
  };
  sort?: RiskScoreBetterSortField;
  filterQuery?: ESQuery | string | undefined;
}

export interface HostsRiskScoreStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  totalCount: number;
}

export interface HostsRiskScore {
  '@timestamp': string;
  host: {
    name: string;
  };
  risk: string;
  risk_stats: {
    rule_risks: RuleRisk[];
    risk_score: number;
  };
}

export interface RuleRisk {
  rule_name: string;
  rule_risk: number;
}

export const getHostRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return `${RISKY_HOSTS_INDEX_PREFIX}${onlyLatest ? 'latest_' : ''}${spaceId}`;
};

export type RiskScoreBetterSortField = SortField<RiskScoreBetterFields>;
