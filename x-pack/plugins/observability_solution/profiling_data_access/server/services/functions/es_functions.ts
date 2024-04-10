/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  profilingAWSCostDiscountRate,
  profilingCo2PerKWH,
  profilingCostPervCPUPerHour,
  profilingDatacenterPUE,
  profilingPervCPUWattArm64,
  profilingPervCPUWattX86,
  profilingAzureCostDiscountRate,
  profilingShowErrorFrames,
} from '@kbn/observability-plugin/common';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import { AggregationField } from '@kbn/profiling-utils';
import { RegisterServicesParams } from '../register_services';

export interface FetchFunctionsParams {
  core: CoreRequestHandlerContext;
  esClient: ElasticsearchClient;
  indices?: string[];
  stacktraceIdsField?: string;
  query: QueryDslQueryContainer;
  aggregationField?: AggregationField;
}

const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

export function createFetchESFunctions({ createProfilingEsClient }: RegisterServicesParams) {
  return async ({
    core,
    esClient,
    indices,
    stacktraceIdsField,
    query,
    aggregationField,
  }: FetchFunctionsParams) => {
    const [
      co2PerKWH,
      datacenterPUE,
      pervCPUWattX86,
      pervCPUWattArm64,
      awsCostDiscountRate,
      costPervCPUPerHour,
      azureCostDiscountRate,
    ] = await Promise.all([
      core.uiSettings.client.get<number>(profilingCo2PerKWH),
      core.uiSettings.client.get<number>(profilingDatacenterPUE),
      core.uiSettings.client.get<number>(profilingPervCPUWattX86),
      core.uiSettings.client.get<number>(profilingPervCPUWattArm64),
      core.uiSettings.client.get<number>(profilingAWSCostDiscountRate),
      core.uiSettings.client.get<number>(profilingCostPervCPUPerHour),
      core.uiSettings.client.get<number>(profilingAzureCostDiscountRate),
      core.uiSettings.client.get<boolean>(profilingShowErrorFrames),
    ]);

    const profilingEsClient = createProfilingEsClient({ esClient });

    return profilingEsClient.topNFunctions({
      query,
      indices,
      stacktraceIdsField,
      aggregationField,
      co2PerKWH,
      datacenterPUE,
      pervCPUWattX86,
      pervCPUWattArm64,
      awsCostDiscountRate,
      costPervCPUPerHour,
      azureCostDiscountRate,
    });
  };
}
