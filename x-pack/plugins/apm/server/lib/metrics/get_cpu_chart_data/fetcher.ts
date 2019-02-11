/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationSearchResponse, ESFilter } from 'elasticsearch';
import {
  METRIC_PROCESS_CPU_PERCENT,
  METRIC_SYSTEM_CPU_PERCENT,
  PROCESSOR_NAME,
  SERVICE_NAME
} from 'x-pack/plugins/apm/common/constants';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { AggValue, MetricsRequestArgs, TimeSeriesBucket } from '../query_types';

interface Bucket extends TimeSeriesBucket {
  systemCPUAverage: AggValue;
  systemCPUMax: AggValue;
  processCPUAverage: AggValue;
  processCPUMax: AggValue;
}

interface Aggs {
  timeseriesData: {
    buckets: Bucket[];
  };
  systemCPUAverage: AggValue;
  systemCPUMax: AggValue;
  processCPUAverage: AggValue;
  processCPUMax: AggValue;
}

export type ESResponse = AggregationSearchResponse<void, Aggs>;

export async function fetch({
  serviceName,
  setup
}: MetricsRequestArgs): Promise<ESResponse> {
  const { start, end, esFilterQuery, client, config } = setup;
  const { intervalString } = getBucketSize(start, end, 'auto');
  const filters: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_NAME]: 'metric' } },
    {
      range: { '@timestamp': { gte: start, lte: end, format: 'epoch_millis' } }
    }
  ];

  if (esFilterQuery) {
    filters.push(esFilterQuery);
  }

  const params = {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      size: 0,
      query: { bool: { filter: filters } },
      aggs: {
        timeseriesData: {
          date_histogram: {
            field: '@timestamp',
            interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end }
          },
          aggs: {
            systemCPUAverage: { avg: { field: METRIC_SYSTEM_CPU_PERCENT } },
            systemCPUMax: { max: { field: METRIC_SYSTEM_CPU_PERCENT } },
            processCPUAverage: { avg: { field: METRIC_PROCESS_CPU_PERCENT } },
            processCPUMax: { max: { field: METRIC_PROCESS_CPU_PERCENT } }
          }
        },
        systemCPUAverage: { avg: { field: METRIC_SYSTEM_CPU_PERCENT } },
        systemCPUMax: { max: { field: METRIC_SYSTEM_CPU_PERCENT } },
        processCPUAverage: { avg: { field: METRIC_PROCESS_CPU_PERCENT } },
        processCPUMax: { max: { field: METRIC_PROCESS_CPU_PERCENT } }
      }
    }
  };

  return client<void, Aggs>('search', params);
}
