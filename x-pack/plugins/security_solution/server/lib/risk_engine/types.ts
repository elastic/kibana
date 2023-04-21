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
  debug?: boolean;
  index: string;
  filter?: unknown;
  identifierType?: IdentifierType;
  enrichInputs?: boolean;
  range: { start: string; end: string };
  weights?: RiskScoreWeight[];
}

export interface GetScoresResponse {
  debug?: {
    request: unknown;
    response: unknown;
  };
  scores: SimpleRiskScore[] | FullRiskScore[];
}

export interface SimpleRiskInput {
  _id: string;
  _index: string;
  sort: [number];
}

export type RiskInput = Ecs;

export interface BaseRiskScore {
  '@timestamp': string;
  identifierField: string;
  identifierValue: string;
  level: string;
  totalScore: number;
  totalScoreNormalized: number;
  alertsScore: number;
  otherScore: number;
  notes: string[];
}

export interface SimpleRiskScore extends BaseRiskScore {
  riskiestInputs: SimpleRiskInput[];
}

export interface FullRiskScore extends BaseRiskScore {
  riskiestInputs: RiskInput[];
}

export interface CalculateRiskScoreAggregations {
  user?: {
    after_key: { [identifierField: string]: string };
    buckets: RiskScoreBucket[];
  };
  host?: {
    after_key: { [identifierField: string]: string };
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
