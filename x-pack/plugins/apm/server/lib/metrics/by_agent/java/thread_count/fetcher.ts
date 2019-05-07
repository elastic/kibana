/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ESFilter } from 'elasticsearch';
import {
  SERVICE_AGENT_NAME,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  METRIC_JAVA_THREAD_COUNT
} from '../../../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../../../helpers/setup_request';
import { MetricsAggs, MetricSeriesKeys, AggValue } from '../../../types';
import { getMetricsDateHistogramParams } from '../../../../helpers/metrics';
import { rangeFilter } from '../../../../helpers/range_filter';

export interface ThreadCountMetrics extends MetricSeriesKeys {
  threadCount: AggValue;
}

export async function fetch(setup: Setup, serviceName: string) {
  const { start, end, esFilterQuery, client, config } = setup;
  const filters: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: 'metric' } },
    { term: { [SERVICE_AGENT_NAME]: 'java' } },
    {
      range: rangeFilter(start, end)
    }
  ];

  if (esFilterQuery) {
    filters.push(esFilterQuery);
  }

  const aggs = {
    threadCount: { avg: { field: METRIC_JAVA_THREAD_COUNT } }
  };

  const params = {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      size: 0,
      query: { bool: { filter: filters } },
      aggs: {
        timeseriesData: {
          date_histogram: getMetricsDateHistogramParams(start, end),
          aggs
        },
        ...aggs
      }
    }
  };

  return client<void, MetricsAggs<ThreadCountMetrics>>('search', params);
}
