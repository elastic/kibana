/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy } from 'lodash';
import { TRACE_ID } from '../../../common/elasticsearch_fieldnames';
import { getOverallLatencyDistribution } from '../../routes/latency_distribution/get_overall_latency_distribution';
import { OverallLatencyDistributionResponse } from '../../routes/latency_distribution/types';
import { TraceMetricFetcher } from './trace_metric_fetcher';

export type TraceDistributionResponse = OverallLatencyDistributionResponse;

export const traceDistributionFetcher: TraceMetricFetcher<TraceDistributionResponse> =
  async ({ start, end, environment, apmEventClient, traceIds, prev }) => {
    const nextDistribution = await getOverallLatencyDistribution({
      start,
      end,
      environment,
      kuery: '',
      percentileThreshold: 95,
      apmEventClient,
      termFilters: [{ fieldName: TRACE_ID, fieldValue: traceIds }],
      ...(prev && prev.overallHistogram
        ? {
            range: {
              min: prev.overallHistogram[0].key,
              max: prev.overallHistogram[1].key,
            },
          }
        : {}),
    });

    const prevHistogramByKey = keyBy(prev?.overallHistogram, 'key');

    return {
      percentileThresholdValue: prev?.percentileThresholdValue,
      overallHistogram: nextDistribution.overallHistogram?.map((bucket) => {
        return {
          doc_count:
            bucket.doc_count + (prevHistogramByKey[bucket.key]?.doc_count ?? 0),
          key: bucket.key,
        };
      }),
    };
  };
