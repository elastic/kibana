/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ESFilter } from 'elasticsearch';
import {
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../typings/common';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { AggValue, MetricsRequestArgs, TimeSeriesBucket } from '../query_types';

interface Bucket extends TimeSeriesBucket {
  memoryUsedAvg: AggValue;
  memoryUsedMax: AggValue;
}

interface Aggs {
  timeseriesData: {
    buckets: Bucket[];
  };
  memoryUsedAvg: AggValue;
  memoryUsedMax: AggValue;
}

export type ESResponse = PromiseReturnType<typeof fetch>;
export async function fetch({ serviceName, setup }: MetricsRequestArgs) {
  const { start, end, esFilterQuery, client, config } = setup;
  const { bucketSize } = getBucketSize(start, end, 'auto');
  const filters: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: 'metric' } },
    {
      range: { '@timestamp': { gte: start, lte: end, format: 'epoch_millis' } }
    },
    { exists: { field: METRIC_SYSTEM_TOTAL_MEMORY } },
    { exists: { field: METRIC_SYSTEM_FREE_MEMORY } }
  ];

  if (esFilterQuery) {
    filters.push(esFilterQuery);
  }

  const script = {
    lang: 'expression',
    source: `1 - doc['${METRIC_SYSTEM_FREE_MEMORY}'] / doc['${METRIC_SYSTEM_TOTAL_MEMORY}']`
  };

  const params = {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      size: 0,
      query: { bool: { filter: filters } },
      aggs: {
        timeseriesData: {
          date_histogram: {
            field: '@timestamp',

            // ensure minimum bucket size of 30s since this is the default resolution for metric data
            interval: `${Math.max(bucketSize, 30)}s`,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end }
          },
          aggs: {
            memoryUsedAvg: { avg: { script } },
            memoryUsedMax: { max: { script } }
          }
        },
        memoryUsedAvg: { avg: { script } },
        memoryUsedMax: { max: { script } }
      }
    }
  };

  return client<void, Aggs>('search', params);
}
