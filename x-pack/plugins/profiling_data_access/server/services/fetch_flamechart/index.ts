/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { createBaseFlameGraph, createCalleeTree } from '@kbn/profiling-utils';
import { withProfilingSpan } from '../../utils/with_profiling_span';
import { RegisterServicesParams } from '../register_services';
import { searchStackTraces } from '../search_stack_traces';

export interface FetchFlamechartParams {
  esClient: ElasticsearchClient;
  rangeFromMs: number;
  rangeToMs: number;
  kuery: string;
}

export function createFetchFlamechart({ createProfilingEsClient }: RegisterServicesParams) {
  return async ({ esClient, rangeFromMs, rangeToMs, kuery }: FetchFlamechartParams) => {
    const rangeFromSecs = rangeFromMs / 1000;
    const rangeToSecs = rangeToMs / 1000;

    const profilingEsClient = createProfilingEsClient({ esClient });
    const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

    const totalSeconds = rangeToSecs - rangeFromSecs;

    const { events, stackTraces, executables, stackFrames, totalFrames, samplingRate } =
      await searchStackTraces({
        client: profilingEsClient,
        rangeFrom: rangeFromSecs,
        rangeTo: rangeToSecs,
        kuery,
        sampleSize: targetSampleSize,
      });

    const flamegraph = await withProfilingSpan('create_flamegraph', async () => {
      const tree = createCalleeTree(
        events,
        stackTraces,
        stackFrames,
        executables,
        totalFrames,
        samplingRate
      );

      return createBaseFlameGraph(tree, samplingRate, totalSeconds);
    });

    return flamegraph;
  };
}
