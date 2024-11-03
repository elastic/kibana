/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type {
  AfterKeys,
  EntityAfterKey,
  RiskScoreWeights,
} from '../../../common/api/entity_analytics/common';
import type { IdentifierType, Range } from '../../../common/entity_analytics/risk_engine';
import type { ConfigType } from '../../config';
import type { StartPlugins } from '../../plugin';
import type { SecuritySolutionPluginRouter } from '../../types';
export type EntityAnalyticsConfig = ConfigType['entityAnalytics'];

export interface EntityAnalyticsRoutesDeps {
  router: SecuritySolutionPluginRouter;
  logger: Logger;
  config: ConfigType;
  getStartServices: StartServicesAccessor<StartPlugins>;
}

export interface CalculateRiskScoreAggregations {
  user?: {
    after_key: EntityAfterKey;
    buckets: RiskScoreBucket[];
  };
  host?: {
    after_key: EntityAfterKey;
    buckets: RiskScoreBucket[];
  };
}

export interface SearchHitRiskInput {
  id: string;
  index: string;
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

export interface CalculateScoresParams {
  afterKeys: AfterKeys;
  debug?: boolean;
  index: string;
  filter?: unknown;
  identifierType?: IdentifierType;
  pageSize: number;
  range: { start: string; end: string };
  runtimeMappings: MappingRuntimeFields;
  weights?: RiskScoreWeights;
  alertSampleSizePerShard?: number;
  excludeAlertStatuses?: string[];
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
  weights?: RiskScoreWeights;
  alertSampleSizePerShard?: number;
  returnScores?: boolean;
  refresh?: 'wait_for';
}
