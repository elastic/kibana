/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationSearchResponse } from 'elasticsearch';
import {
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY
} from 'x-pack/plugins/apm/common/constants';
import { fetchMetrics } from '../metricsFetcher';
import { AggValue, MetricsRequestArgs, TimeSeriesBucket } from '../query_types';

interface Bucket extends TimeSeriesBucket {
  averagePercentMemoryUsed: AggValue;
  maximumPercentMemoryUsed: AggValue;
}

interface Aggs {
  timeseriesData: {
    buckets: Bucket[];
  };
  averagePercentMemoryUsed: AggValue;
  maximumPercentMemoryUsed: AggValue;
}

export type ESResponse = AggregationSearchResponse<void, Aggs>;

const percentSystemMemoryUsedScript = {
  script: {
    lang: 'expression',
    source: `1 - doc['${METRIC_SYSTEM_FREE_MEMORY}'] / doc['${METRIC_SYSTEM_TOTAL_MEMORY}']`
  }
};

export async function fetch(args: MetricsRequestArgs) {
  return fetchMetrics<Aggs>({
    ...args,
    timeseriesBucketAggregations: {
      averagePercentMemoryUsed: { avg: percentSystemMemoryUsedScript },
      maximumPercentMemoryUsed: { max: percentSystemMemoryUsedScript }
    },
    totalAggregations: {
      averagePercentMemoryUsed: { avg: percentSystemMemoryUsedScript },
      maximumPercentMemoryUsed: { max: percentSystemMemoryUsedScript }
    }
  });
}
