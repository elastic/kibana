/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type {
  AggregationField,
  BaseFlameGraph,
  ESTopNFunctions,
  ProfilingStatusResponse,
  StackTraceResponse,
} from '@kbn/profiling-utils';

export interface ProfilingESClient {
  search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
    operationName: string,
    searchRequest: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
  profilingStacktraces(params: {
    query: QueryDslQueryContainer;
    sampleSize: number;
    durationSeconds: number;
    co2PerKWH?: number;
    datacenterPUE?: number;
    pervCPUWattX86?: number;
    pervCPUWattArm64?: number;
    awsCostDiscountRate?: number;
    costPervCPUPerHour?: number;
    azureCostDiscountRate?: number;
    indices?: string[];
    stacktraceIdsField?: string;
  }): Promise<StackTraceResponse>;
  profilingStatus(params?: { waitForResourcesCreated?: boolean }): Promise<ProfilingStatusResponse>;
  getEsClient(): ElasticsearchClient;
  profilingFlamegraph(params: {
    query: QueryDslQueryContainer;
    sampleSize: number;
    durationSeconds: number;
    co2PerKWH?: number;
    datacenterPUE?: number;
    pervCPUWattX86?: number;
    pervCPUWattArm64?: number;
    awsCostDiscountRate?: number;
    azureCostDiscountRate?: number;
    costPervCPUPerHour?: number;
    indices?: string[];
    stacktraceIdsField?: string;
  }): Promise<BaseFlameGraph>;
  topNFunctions(params: {
    query: QueryDslQueryContainer;
    limit?: number;
    sampleSize?: number;
    indices?: string[];
    stacktraceIdsField?: string;
    aggregationField?: AggregationField;
    co2PerKWH?: number;
    datacenterPUE?: number;
    pervCPUWattX86?: number;
    pervCPUWattArm64?: number;
    awsCostDiscountRate?: number;
    azureCostDiscountRate?: number;
    costPervCPUPerHour?: number;
    durationSeconds: number;
  }): Promise<ESTopNFunctions>;
}
