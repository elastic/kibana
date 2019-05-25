/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY
} from '../../../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../../../helpers/setup_request';
import { MetricsAggs, MetricSeriesKeys, AggValue } from '../../../types';
import { getMetricsDateHistogramParams } from '../../../../helpers/metrics';
import { rangeFilter } from '../../../../helpers/range_filter';

export interface MemoryMetrics extends MetricSeriesKeys {
  memoryUsedAvg: AggValue;
  memoryUsedMax: AggValue;
}

const percentUsedScript = {
  lang: 'expression',
  source: `1 - doc['${METRIC_SYSTEM_FREE_MEMORY}'] / doc['${METRIC_SYSTEM_TOTAL_MEMORY}']`
};

export async function fetch(setup: Setup, serviceName: string) {
  const { start, end, uiFiltersES, client, config } = setup;

  const aggs = {
    memoryUsedAvg: { avg: { script: percentUsedScript } },
    memoryUsedMax: { max: { script: percentUsedScript } }
  };

  const params = {
    index: config.get<string>('apm_oss.metricsIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [PROCESSOR_EVENT]: 'metric' } },
            {
              range: rangeFilter(start, end)
            },
            ...uiFiltersES
          ]
        }
      },
      aggs: {
        timeseriesData: {
          date_histogram: getMetricsDateHistogramParams(start, end),
          aggs
        },
        ...aggs
      }
    }
  };

  return client<void, MetricsAggs<MemoryMetrics>>('search', params);
}
