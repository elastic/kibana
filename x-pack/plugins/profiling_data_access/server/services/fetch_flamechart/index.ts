/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { createBaseFlameGraph, createCalleeTree } from '@kbn/profiling-utils';
import { kqlQuery } from '../../utils/query';
import { withProfilingSpan } from '../../utils/with_profiling_span';
import { RegisterServicesParams } from '../register_services';
import { searchStackTraces } from '../search_stack_traces';

export interface FetchFlamechartParams {
  esClient: ElasticsearchClient;
  rangeFromMs: number;
  rangeToMs: number;
  kuery: string;
  useLegacyFlamegraphAPI?: boolean;
}

const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

export function createFetchFlamechart({ createProfilingEsClient }: RegisterServicesParams) {
  return async ({
    esClient,
    rangeFromMs,
    rangeToMs,
    kuery,
    useLegacyFlamegraphAPI = false,
  }: FetchFlamechartParams) => {
    const rangeFromSecs = rangeFromMs / 1000;
    const rangeToSecs = rangeToMs / 1000;

    const profilingEsClient = createProfilingEsClient({ esClient });

    const totalSeconds = rangeToSecs - rangeFromSecs;
    // Use legacy stack traces API to fetch the flamegraph
    if (useLegacyFlamegraphAPI) {
      const { events, stackTraces, executables, stackFrames, totalFrames, samplingRate } =
        await searchStackTraces({
          client: profilingEsClient,
          rangeFrom: rangeFromSecs,
          rangeTo: rangeToSecs,
          kuery,
          sampleSize: targetSampleSize,
        });

      return await withProfilingSpan('create_flamegraph', async () => {
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
    }

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
    });
    return { ...flamegraph, TotalSeconds: totalSeconds };
  };
}
