/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

export type IdentifierType = 'user' | 'host';
export type RiskCategoryType = 'signals'; // TODO this should be 'alerts' instead of 'signals' but we don't have the category field in ECS

export interface RiskScoreWeight {
  type: string;
  value?: string;
  user?: number;
  host?: number;
}

export interface GetScoresParams {
  afterKeys: AfterKeys;
  debug?: boolean;
  index: string;
  filter?: unknown;
  identifierType?: IdentifierType;
  maxIdentifierBuckets: number;
  range: { start: string; end: string };
  weights?: RiskScoreWeight[];
}

export interface AfterKey {
  [identifierField: string]: string;
}

export interface AfterKeys {
  host?: AfterKey;
  user?: AfterKey;
}

export interface GetScoresResponse {
  debug?: {
    request: unknown;
    response: unknown;
  };
  after_keys: AfterKeys;
  scores: RiskScore[];
}

export interface SimpleRiskInput {
  id: string;
  index: string;
  riskScore: string | number | undefined;
}

export type RiskInput = Ecs;

export interface RiskScore {
  '@timestamp': string;
  identifierField: string;
  identifierValue: string;
  level: string;
  totalScore: number;
  totalScoreNormalized: number;
  alertsScore: number;
  otherScore: number;
  notes: string[];
  riskiestInputs: SimpleRiskInput[] | RiskInput[];
}

export interface CalculateRiskScoreAggregations {
  user?: {
    after_key: AfterKey;
    buckets: RiskScoreBucket[];
  };
  host?: {
    after_key: AfterKey;
    buckets: RiskScoreBucket[];
  };
}

export interface RiskScoreBucket {
  key: { [identifierField: string]: string; category: string };
  doc_count: number;
  risk_details: {
    value: {
      score: number;
      normalized_score: number;
      notes: string[];
      level: string;
      alerts_score: number;
      other_score: number;
    };
  };

  riskiest_inputs: SearchResponse;
}
