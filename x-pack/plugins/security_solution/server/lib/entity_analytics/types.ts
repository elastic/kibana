/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type {
  ALERT_RISK_SCORE,
  ALERT_RULE_NAME,
  ALERT_UUID,
  EVENT_KIND,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type { SecurityAlert } from '@kbn/alerts-as-data-utils';
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
    hits: {
      hits: Array<{
        _id: string;
        _source: Pick<
          SecurityAlert,
          | typeof ALERT_RISK_SCORE
          | typeof EVENT_KIND
          | typeof ALERT_RULE_NAME
          | typeof ALERT_UUID
          | '@timestamp'
        >;
      }>;
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
