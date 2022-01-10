/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FactoryQueryTypes } from '../..';
import type {
  IEsSearchRequest,
  IEsSearchResponse,
} from '../../../../../../../../src/plugins/data/common';
import { RISKY_HOSTS_INDEX_PREFIX } from '../../../../constants';
import { ESTermQuery } from '../../../../typed_json';
import { Direction, Inspect, Maybe, TimerangeInput } from '../../../common';

export interface HostsRiskScoreRequestOptions extends IEsSearchRequest {
  defaultIndex: string[];
  factoryQueryType?: FactoryQueryTypes;
  hostNames?: string[];
  timerange?: TimerangeInput;
  filterQuery?: ESTermQuery | string;
  onlyLatest?: boolean;
  limit?: number;
  sortOrder?: Direction.asc | Direction.desc;
}

export interface HostsRiskScoreStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
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
