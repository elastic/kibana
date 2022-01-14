/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CaseMetricsResponse } from '../../../common/api';
import { CasesClient } from '../client';
import { CasesClientArgs } from '../types';

export interface MetricsHandler {
  getFeatures(): Set<string>;
  compute(): Promise<CaseMetricsResponse>;
  setupFeature?(feature: string): void;
}

export interface AggregationBuilder {
  build(): Record<string, estypes.AggregationsAggregationContainer>;
  formatResponse(aggregations: AggregationResponse): CaseMetricsResponse;
  getName(): string;
}

export type AggregationResponse = Record<string, estypes.AggregationsAggregate> | undefined;

export interface BaseHandlerCommonOptions {
  caseId: string;
  casesClient: CasesClient;
  clientArgs: CasesClientArgs;
}
