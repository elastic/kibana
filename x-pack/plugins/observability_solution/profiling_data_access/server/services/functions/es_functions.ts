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
import {
  AggregationField,
  convertTonsToKgs,
  ESTopNFunctions,
  TopNFunctions,
} from '@kbn/profiling-utils';
import { RegisterServicesParams } from '../register_services';
import { percentToFactor } from '../../utils/percent_to_factor';

export interface FetchFunctionsParams {
  core: CoreRequestHandlerContext;
  esClient: ElasticsearchClient;
  indices?: string[];
  stacktraceIdsField?: string;
  query: QueryDslQueryContainer;
  aggregationField?: AggregationField;
  limit?: number;
  totalSeconds: number;
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
    limit,
    totalSeconds,
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

    const esTopNFunctions = await profilingEsClient.topNFunctions({
      sampleSize: targetSampleSize,
      limit,
      query,
      indices,
      stacktraceIdsField,
      aggregationField,
      co2PerKWH,
      datacenterPUE,
      pervCPUWattX86,
      pervCPUWattArm64,
      awsCostDiscountRate: percentToFactor(awsCostDiscountRate),
      costPervCPUPerHour,
      azureCostDiscountRate: percentToFactor(azureCostDiscountRate),
      durationSeconds: totalSeconds,
    });

    return transformToKibanaTopNFunction(esTopNFunctions);
  };
}

/**
 * Transforms object returned by ES because we share a lot of components in the UI with the current data model
 * We must first align the ES api response type then remove this
 */
function transformToKibanaTopNFunction(esTopNFunctions: ESTopNFunctions): TopNFunctions {
  return {
    TotalCount: esTopNFunctions.total_count,
    totalCPU: esTopNFunctions.total_count,
    selfCPU: esTopNFunctions.self_count,
    totalAnnualCO2Kgs: convertTonsToKgs(esTopNFunctions.self_annual_co2_tons),
    totalAnnualCostUSD: esTopNFunctions.self_annual_cost_usd,
    SamplingRate: 1,
    TopN: esTopNFunctions.topn.map((item) => {
      return {
        Id: item.id,
        Rank: item.rank,
        CountExclusive: item.self_count,
        CountInclusive: item.total_count,
        selfAnnualCO2kgs: convertTonsToKgs(item.self_annual_co2_tons),
        selfAnnualCostUSD: item.self_annual_costs_usd,
        totalAnnualCO2kgs: convertTonsToKgs(item.total_annual_co2_tons),
        totalAnnualCostUSD: item.total_annual_costs_usd,
        subGroups: item.sub_groups,
        Frame: {
          AddressOrLine: item.frame.address_or_line,
          ExeFileName: item.frame.executable_file_name,
          FrameType: item.frame.frame_type,
          FunctionName: item.frame.function_name,
          Inline: item.frame.inline,
          SourceFilename: item.frame.file_name,
          SourceLine: item.frame.line_number,
          FileID: '',
          FrameID: '',
          FunctionOffset: 0,
        },
      };
    }),
  };
}
