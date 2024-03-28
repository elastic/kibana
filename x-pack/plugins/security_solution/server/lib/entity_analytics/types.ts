/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  AfterKey,
  AfterKeys,
  IdentifierType,
  RiskWeights,
  Range,
  RiskEngineStatus,
  RiskScore,
} from '../../../common/entity_analytics/risk_engine';
import type { ConfigType } from '../../config';
export type EntityAnalyticsConfig = ConfigType['entityAnalytics'];

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
  alertSampleSizePerShard?: number;
}

export interface CalculateAndPersistScoresParams {
  afterKeys: AfterKeys;
  debug?: boolean;
  index: string;
  filter?: unknown;
  identifierType: IdentifierType;
  pageSize: number;
  range: Range;
  runtimeMappings: MappingRuntimeFields;
  weights?: RiskWeights;
  alertSampleSizePerShard?: number;
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
  is_max_amount_of_risk_engines_reached: boolean;
}

export interface InitRiskEngineResultResponse {
  risk_engine_enabled: boolean;
  risk_engine_resources_installed: boolean;
  risk_engine_configuration_created: boolean;
  legacy_risk_engine_disabled: boolean;
  errors: string[];
}

export interface InitRiskEngineResponse {
  result: InitRiskEngineResultResponse;
}

export interface InitRiskEngineError {
  body: {
    message: string;
    full_error: InitRiskEngineResultResponse | undefined;
  };
}

export interface EnableDisableRiskEngineErrorResponse {
  body: {
    message: string;
    full_error: string;
  };
}

export interface EnableRiskEngineResponse {
  success: boolean;
}

export interface DisableRiskEngineResponse {
  success: boolean;
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

export interface SearchHitRiskInput {
  id: string[];
  index: string[];
  rule_name?: string;
  time?: string;
  score?: number;
  contribution?: number;
}

export interface RiskScoreBucket {
  key: { [identifierField: string]: string };
  doc_count: number;
  top_inputs: {
    doc_count: number;
    risk_details: {
      value: {
        score: number;
        normalized_score: number;
        notes: string[];
        category_1_score: number;
        category_1_count: number;
        risk_inputs: SearchHitRiskInput[];
      };
    };
    inputs: SearchResponse;
  };
}

export interface RiskEngineConfiguration {
  dataViewId: string;
  enabled: boolean;
  filter: unknown;
  identifierType: IdentifierType | undefined;
  interval: string;
  pageSize: number;
  range: Range;
  alertSampleSizePerShard?: number;
}
