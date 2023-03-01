/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewId } from '../../../common/detection_engine/rule_schema';

export type IdentifierType = 'user' | 'host';

export interface GetScoresParams {
  dataViewId?: DataViewId;
  filters?: unknown[];
  range: { start: string; end: string };
  identifierType?: IdentifierType;
}

export interface GetScoresResponse {
  hosts: RiskScores;
  users: RiskScores;
}

export interface RiskScore {
  '@timestamp': string;
  identifierField: string;
  identifierValue: string;
  // calculatedLevel: string;
  // calculatedScore: number;
  calculatedScoreNorm: number;
  riskiest_inputs: RiskInput[] | Ecs[];
}

export interface RiskInput {
  _id: string;
  _index: string;
}

export type RiskScores = RiskScore[];

export interface CalculateRiskScoreAggregations {
  users: {
    buckets: RiskScoreBucket[];
  };
  hosts: {
    buckets: RiskScoreBucket[];
  };
}

interface RiskScoreBucket {
  key: string;
  doc_count: number;
  normalized_score: { value: number };
  riskiest_inputs: SearchResponse;
}
