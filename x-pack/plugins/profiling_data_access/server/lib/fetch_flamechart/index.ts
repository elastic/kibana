/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { RegisterServicesParams } from '../../services/register_services';
import { withProfilingSpan } from '../../utils/with_profiling_span';
import { searchStackTraces } from '../search_stack_traces';
import { createCalleeTree } from '../../../common/callee';
import { createBaseFlameGraph } from '../../../common/flamegraph';

interface FetchFlamechartParams {
  esClient: ElasticsearchClient;
  rangeFrom: number;
  rangeTo: number;
  kuery: string;
}

export function fetchFlamechart({ createProfilingEsClient }: RegisterServicesParams) {
  return async ({ esClient, rangeFrom, rangeTo, kuery }: FetchFlamechartParams) => {
    const profilingEsClient = createProfilingEsClient({ esClient });
    const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

    const totalSeconds = rangeTo - rangeFrom;

    const { events, stackTraces, executables, stackFrames, totalFrames, samplingRate } =
      await searchStackTraces({
        client: profilingEsClient,
        rangeFrom,
        rangeTo,
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

      const fg = createBaseFlameGraph(tree, samplingRate, totalSeconds);

      return fg;
    });

    return flamegraph;
  };
}
