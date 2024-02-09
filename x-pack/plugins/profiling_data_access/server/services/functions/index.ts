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
  profilingShowErrorFrames,
} from '@kbn/observability-plugin/common';
import { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import { createTopNFunctions } from '@kbn/profiling-utils';
import { percentToFactor } from '../../utils/percent_to_factor';
import { withProfilingSpan } from '../../utils/with_profiling_span';
import { RegisterServicesParams } from '../register_services';
import { searchStackTraces } from '../search_stack_traces';

export interface FetchFunctionsParams {
  core: CoreRequestHandlerContext;
  esClient: ElasticsearchClient;
  rangeFromMs: number;
  rangeToMs: number;
  kuery: string;
  startIndex: number;
  endIndex: number;
}

const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

export function createFetchFunctions({ createProfilingEsClient }: RegisterServicesParams) {
  return async ({
    core,
    esClient,
    rangeFromMs,
    rangeToMs,
    kuery,
    startIndex,
    endIndex,
  }: FetchFunctionsParams) => {
    const rangeFromSecs = rangeFromMs / 1000;
    const rangeToSecs = rangeToMs / 1000;
    const totalSeconds = rangeToSecs - rangeFromSecs;

    const [
      co2PerKWH,
      datacenterPUE,
      pervCPUWattX86,
      pervCPUWattArm64,
      awsCostDiscountRate,
      costPervCPUPerHour,
      showErrorFrames,
    ] = await Promise.all([
      core.uiSettings.client.get<number>(profilingCo2PerKWH),
      core.uiSettings.client.get<number>(profilingDatacenterPUE),
      core.uiSettings.client.get<number>(profilingPervCPUWattX86),
      core.uiSettings.client.get<number>(profilingPervCPUWattArm64),
      core.uiSettings.client.get<number>(profilingAWSCostDiscountRate),
      core.uiSettings.client.get<number>(profilingCostPervCPUPerHour),
      core.uiSettings.client.get<boolean>(profilingShowErrorFrames),
    ]);

    const profilingEsClient = createProfilingEsClient({ esClient });

    const { events, stackTraces, executables, stackFrames, samplingRate } = await searchStackTraces(
      {
        client: profilingEsClient,
        rangeFrom: rangeFromSecs,
        rangeTo: rangeToSecs,
        kuery,
        sampleSize: targetSampleSize,
        durationSeconds: totalSeconds,
        co2PerKWH,
        datacenterPUE,
        pervCPUWattX86,
        pervCPUWattArm64,
        awsCostDiscountRate: percentToFactor(awsCostDiscountRate),
        costPervCPUPerHour,
        showErrorFrames,
      }
    );

    const topNFunctions = await withProfilingSpan('create_topn_functions', async () => {
      return createTopNFunctions({
        endIndex,
        events,
        executables,
        samplingRate,
        stackFrames,
        stackTraces,
        startIndex,
        showErrorFrames,
      });
    });

    return topNFunctions;
  };
}
