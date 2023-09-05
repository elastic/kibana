/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { createTopNFunctions } from '@kbn/profiling-utils';
import { withProfilingSpan } from '../../utils/with_profiling_span';
import { RegisterServicesParams } from '../register_services';
import { searchStackTraces } from '../search_stack_traces';

export interface FetchFunctionsParams {
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
    esClient,
    rangeFromMs,
    rangeToMs,
    kuery,
    startIndex,
    endIndex,
  }: FetchFunctionsParams) => {
    const rangeFromSecs = rangeFromMs / 1000;
    const rangeToSecs = rangeToMs / 1000;

    const profilingEsClient = createProfilingEsClient({ esClient });

    const { events, stackTraces, executables, stackFrames, samplingRate } = await searchStackTraces(
      {
        client: profilingEsClient,
        rangeFrom: rangeFromSecs,
        rangeTo: rangeToSecs,
        kuery,
        sampleSize: targetSampleSize,
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
      });
    });

    return topNFunctions;
  };
}
