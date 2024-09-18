/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type {
  BaseFlameGraph,
  ESTopNFunctions,
  ProfilingStatusResponse,
  StackTraceResponse,
} from '@kbn/profiling-utils';
import { ProfilingESClient } from '../../common/profiling_es_client';
import { unwrapEsResponse } from './unwrap_es_response';
import { withProfilingSpan } from './with_profiling_span';

export function createProfilingEsClient({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): ProfilingESClient {
  return {
    search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      operationName: string,
      searchRequest: TSearchRequest
    ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
      const controller = new AbortController();

      const promise = withProfilingSpan(operationName, () => {
        return esClient.search(searchRequest, {
          signal: controller.signal,
          meta: true,
        }) as unknown as Promise<{
          body: InferSearchResponseOf<TDocument, TSearchRequest>;
        }>;
      });

      return unwrapEsResponse(promise);
    },
    profilingStacktraces({
      query,
      sampleSize,
      durationSeconds,
      co2PerKWH,
      datacenterPUE,
      awsCostDiscountRate,
      costPervCPUPerHour,
      pervCPUWattArm64,
      pervCPUWattX86,
      azureCostDiscountRate,
      indices,
      stacktraceIdsField,
    }) {
      const controller = new AbortController();
      const promise = withProfilingSpan('_profiling/stacktraces', () => {
        return esClient.transport.request(
          {
            method: 'POST',
            path: encodeURI('/_profiling/stacktraces'),
            body: {
              query,
              sample_size: sampleSize,
              requested_duration: durationSeconds,
              co2_per_kwh: co2PerKWH,
              per_core_watt_x86: pervCPUWattX86,
              per_core_watt_arm64: pervCPUWattArm64,
              datacenter_pue: datacenterPUE,
              aws_cost_factor: awsCostDiscountRate,
              cost_per_core_hour: costPervCPUPerHour,
              azure_cost_factor: azureCostDiscountRate,
              indices,
              stacktrace_ids_field: stacktraceIdsField,
            },
          },
          {
            signal: controller.signal,
            meta: true,
          }
        );
      });

      return unwrapEsResponse(promise) as Promise<StackTraceResponse>;
    },
    profilingStatus({ waitForResourcesCreated = false } = {}) {
      const controller = new AbortController();

      const promise = withProfilingSpan('_profiling/status', () => {
        return esClient.transport.request(
          {
            method: 'GET',
            path: encodeURI(
              `/_profiling/status?wait_for_resources_created=${waitForResourcesCreated}`
            ),
          },
          {
            signal: controller.signal,
            meta: true,
          }
        );
      });

      return unwrapEsResponse(promise) as Promise<ProfilingStatusResponse>;
    },
    getEsClient() {
      return esClient;
    },
    profilingFlamegraph({
      query,
      sampleSize,
      durationSeconds,
      co2PerKWH,
      datacenterPUE,
      awsCostDiscountRate,
      costPervCPUPerHour,
      pervCPUWattArm64,
      pervCPUWattX86,
      azureCostDiscountRate,
      indices,
      stacktraceIdsField,
    }) {
      const controller = new AbortController();

      const promise = withProfilingSpan('_profiling/flamegraph', () => {
        return esClient.transport.request(
          {
            method: 'POST',
            path: encodeURI('/_profiling/flamegraph'),
            body: {
              query,
              sample_size: sampleSize,
              requested_duration: durationSeconds,
              co2_per_kwh: co2PerKWH,
              per_core_watt_x86: pervCPUWattX86,
              per_core_watt_arm64: pervCPUWattArm64,
              datacenter_pue: datacenterPUE,
              aws_cost_factor: awsCostDiscountRate,
              cost_per_core_hour: costPervCPUPerHour,
              azure_cost_factor: azureCostDiscountRate,
              indices,
              stacktrace_ids_field: stacktraceIdsField,
            },
          },
          {
            signal: controller.signal,
            meta: true,
          }
        );
      });
      return unwrapEsResponse(promise) as Promise<BaseFlameGraph>;
    },
    topNFunctions({
      query,
      aggregationField,
      indices,
      stacktraceIdsField,
      co2PerKWH,
      datacenterPUE,
      awsCostDiscountRate,
      costPervCPUPerHour,
      pervCPUWattArm64,
      pervCPUWattX86,
      azureCostDiscountRate,
      sampleSize,
      limit,
      durationSeconds,
    }) {
      const controller = new AbortController();

      const promise = withProfilingSpan('_profiling/topn/functions', () => {
        return esClient.transport.request(
          {
            method: 'POST',
            path: encodeURI('/_profiling/topn/functions'),
            body: {
              query,
              sample_size: sampleSize,
              limit,
              indices,
              stacktrace_ids_field: stacktraceIdsField,
              aggregation_field: aggregationField,
              co2_per_kwh: co2PerKWH,
              per_core_watt_x86: pervCPUWattX86,
              per_core_watt_arm64: pervCPUWattArm64,
              datacenter_pue: datacenterPUE,
              aws_cost_factor: awsCostDiscountRate,
              cost_per_core_hour: costPervCPUPerHour,
              azure_cost_factor: azureCostDiscountRate,
              requested_duration: durationSeconds,
            },
          },
          {
            signal: controller.signal,
            meta: true,
          }
        );
      });
      return unwrapEsResponse(promise) as Promise<ESTopNFunctions>;
    },
  };
}
