/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  CasesMetricsFeatureField,
  SingleCaseMetricsFeatureField,
} from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';

export interface MetricsHandler<R> {
  getFeatures(): Set<CasesMetricsFeatureField>;
  compute(): Promise<R>;
  setupFeature?(feature: CasesMetricsFeatureField): void;
}

export interface AggregationBuilder<R> {
  build(): Record<string, estypes.AggregationsAggregationContainer>;
  formatResponse(aggregations: AggregationResponse): R;
  getName(): string;
}

export type AggregationResponse = Record<string, estypes.AggregationsAggregate> | undefined;

export interface BaseHandlerCommonOptions {
  casesClient: CasesClient;
  clientArgs: CasesClientArgs;
}

export interface SingleCaseBaseHandlerCommonOptions extends BaseHandlerCommonOptions {
  caseId: string;
}

export interface AllCasesBaseHandlerCommonOptions extends BaseHandlerCommonOptions {
  from?: string;
  to?: string;
  owner?: string | string[];
}

export interface GetCaseMetricsParams {
  caseId: string;
  features: SingleCaseMetricsFeatureField[];
}
