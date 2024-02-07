/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import {
  profilingAWSCostDiscountRate,
  profilingCo2PerKWH,
  profilingCostPervCPUPerHour,
  profilingDatacenterPUE,
  profilingPervCPUWattArm64,
  profilingPervCPUWattX86,
} from '@kbn/observability-plugin/common';
import { percentToFactor } from '../../utils/percent_to_factor';
import { kqlQuery } from '../../utils/query';
import { RegisterServicesParams } from '../register_services';

export interface FetchFlamechartParams {
  esClient: ElasticsearchClient;
  core: CoreRequestHandlerContext;
  rangeFromMs: number;
  rangeToMs: number;
  kuery: string;
}

const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

export function createFetchFlamechart({ createProfilingEsClient }: RegisterServicesParams) {
  return async ({ core, esClient, rangeFromMs, rangeToMs, kuery }: FetchFlamechartParams) => {
    const rangeFromSecs = rangeFromMs / 1000;
    const rangeToSecs = rangeToMs / 1000;

    const [
      co2PerKWH,
      datacenterPUE,
      pervCPUWattX86,
      pervCPUWattArm64,
      awsCostDiscountRate,
      costPervCPUPerHour,
    ] = await Promise.all([
      core.uiSettings.client.get<number>(profilingCo2PerKWH),
      core.uiSettings.client.get<number>(profilingDatacenterPUE),
      core.uiSettings.client.get<number>(profilingPervCPUWattX86),
      core.uiSettings.client.get<number>(profilingPervCPUWattArm64),
      core.uiSettings.client.get<number>(profilingAWSCostDiscountRate),
      core.uiSettings.client.get<number>(profilingCostPervCPUPerHour),
    ]);

    const profilingEsClient = createProfilingEsClient({ esClient });
    const totalSeconds = rangeToSecs - rangeFromSecs;
    const flamegraph = await profilingEsClient.profilingFlamegraph({
      query: {
        bool: {
          filter: [
            ...kqlQuery(kuery),
            {
              range: {
                ['@timestamp']: {
                  gte: String(rangeFromSecs),
                  lt: String(rangeToSecs),
                  format: 'epoch_second',
                },
              },
            },
          ],
        },
      },
      sampleSize: targetSampleSize,
      durationSeconds: totalSeconds,
      co2PerKWH,
      datacenterPUE,
      pervCPUWattX86,
      pervCPUWattArm64,
      awsCostDiscountRate: percentToFactor(awsCostDiscountRate),
      costPervCPUPerHour,
    });
    return { ...flamegraph, TotalSeconds: totalSeconds };
  };
}
