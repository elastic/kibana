/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { MappingRuntimeFields, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  AfterKey,
  AfterKeys,
  IdentifierType,
  RiskCategories,
  RiskWeights,
} from '../../../common/risk_engine';
import type { RiskEngineStatus, InitRiskEngineResult } from '../../../common/risk_engine/types';
export interface CalculateScoresParams {
  afterKeys: AfterKeys;
  debug?: boolean;
  index: string;
  filter?: unknown;
  identifierType?: IdentifierType;
  pageSize: number;
  range: { start: string; end: string };
  runtimeMappings: MappingRuntimeFields;
  weights?: RiskWeights;
}

export interface CalculateAndPersistScoresParams {
  afterKeys: AfterKeys;
  debug?: boolean;
  index: string;
  filter?: unknown;
  identifierType: IdentifierType;
  pageSize: number;
  range: { start: string; end: string };
  runtimeMappings: MappingRuntimeFields;
  weights?: RiskWeights;
}

export interface CalculateAndPersistScoresResponse {
  after_keys: AfterKeys;
  errors: string[];
  scores_written: number;
}

export interface CalculateScoresResponse {
  debug?: {
    request: unknown;
    response: unknown;
  };
  after_keys: AfterKeys;
  scores: {
    host?: RiskScore[];
    user?: RiskScore[];
  };
}

export interface GetRiskEngineStatusResponse {
  legacy_risk_engine_status: RiskEngineStatus;
  risk_engine_status: RiskEngineStatus;
}

export interface InitStep {
  type: string;
  success: boolean;
  error?: string;
}

export interface InitRiskEngineResponse {
  result: InitRiskEngineResult;
}

export interface InitRiskEngineError {
  body: {
    message: {
      message: string;
      full_error: InitRiskEngineResult | string;
    };
  };
}

export interface EnableDisableRiskEngineResponse {
  body: {
    message: {
      message: string;
      full_error: string;
    };
  };
}

export interface GetRiskEngineEnableResponse {
  success: boolean;
}

export interface GetRiskEngineDisableResponse {
  success: boolean;
}

export interface SimpleRiskInput {
  id: string;
  index: string;
  category: RiskCategories;
  description: string;
  risk_score: string | number | undefined;
  timestamp: string | undefined;
}

export type RiskInput = Ecs;

export interface EcsRiskScore {
  '@timestamp': string;
  host?: {
    risk: Omit<RiskScore, '@timestamp'>;
  };
  user?: {
    risk: Omit<RiskScore, '@timestamp'>;
  };
}

export interface RiskScore {
  '@timestamp': string;
  id_field: string;
  id_value: string;
  calculated_level: string;
  calculated_score: number;
  calculated_score_norm: number;
  category_1_score: number;
  category_1_count: number;
  notes: string[];
  inputs: SimpleRiskInput[] | RiskInput[];
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
  key: { [identifierField: string]: string };
  doc_count: number;
  risk_details: {
    value: {
      score: number;
      normalized_score: number;
      notes: string[];
      level: string;
      category_1_score: number;
      category_1_count: number;
    };
  };
  inputs: SearchResponse;
}
