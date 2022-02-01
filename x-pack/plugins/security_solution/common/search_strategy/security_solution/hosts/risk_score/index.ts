/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsTopMetrics } from '@elastic/elasticsearch/lib/api/types';
import { HostRiskScoreFields, RequestOptionsPaginated } from '../..';
import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { RISKY_HOSTS_INDEX_PREFIX } from '../../../../constants';
import { CursorType, Inspect, Maybe, PageInfoPaginated, SortField } from '../../../common';

export interface HostsRiskScoreRequestOptions extends RequestOptionsPaginated<HostRiskScoreFields> {
  hostNames?: string[];
  onlyLatest?: boolean;
}

export interface HostsRiskScoreStrategyResponse extends IEsSearchResponse {
  inspect?: Maybe<Inspect>;
  totalCount: number;
  edges?: HostRiskScoreEdges[];
  pageInfo?: PageInfoPaginated;
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
  rule_id?: string; // TODO Remove the '?' when the new transform is delivered
}

export const getHostRiskIndex = (spaceId: string, onlyLatest: boolean = true): string => {
  return `${RISKY_HOSTS_INDEX_PREFIX}${onlyLatest ? 'latest_' : ''}${spaceId}`;
};

export type HostRiskScoreSortField = SortField<HostRiskScoreFields>;

export interface HostRiskScoreBuckets {
  key: string;
  latest_risk_hit: {
    top: AggregationsTopMetrics[];
  };
}

export interface HostRiskScoreEdges {
  node: HostsRiskScore;
  cursor: CursorType;
}
export interface HostRiskBuckets {
  buckets: HostRiskScoreBuckets[];
}
export interface HostRiskAggEsItem {
  hosts?: HostRiskBuckets;
}
