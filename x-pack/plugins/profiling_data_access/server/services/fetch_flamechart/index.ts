/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { percentToFactor } from '../../utils/percent_to_factor';
import { kqlQuery } from '../../utils/query';
import { RegisterServicesParams } from '../register_services';

export interface FetchFlamechartParams {
  esClient: ElasticsearchClient;
  rangeFromMs: number;
  rangeToMs: number;
  kuery: string;
  co2PerKWH: number;
  datacenterPUE: number;
  pervCPUWattX86: number;
  pervCPUWattArm64: number;
  awsCostDiscountRate: number;
  costPervCPUPerHour: number;
}

const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

export function createFetchFlamechart({ createProfilingEsClient }: RegisterServicesParams) {
  return async ({
    esClient,
    rangeFromMs,
    rangeToMs,
    kuery,
    co2PerKWH,
    datacenterPUE,
    pervCPUWattX86,
    pervCPUWattArm64,
    awsCostDiscountRate,
    costPervCPUPerHour,
  }: FetchFlamechartParams) => {
    const rangeFromSecs = rangeFromMs / 1000;
    const rangeToSecs = rangeToMs / 1000;

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
