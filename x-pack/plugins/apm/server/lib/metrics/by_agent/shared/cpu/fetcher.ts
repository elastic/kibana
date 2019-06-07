/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  METRIC_PROCESS_CPU_PERCENT,
  METRIC_SYSTEM_CPU_PERCENT,
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../../../helpers/setup_request';
import { MetricsAggs, MetricSeriesKeys, AggValue } from '../../../types';
import { getMetricsDateHistogramParams } from '../../../../helpers/metrics';
import { rangeFilter } from '../../../../helpers/range_filter';

export interface CPUMetrics extends MetricSeriesKeys {
  systemCPUAverage: AggValue;
  systemCPUMax: AggValue;
  processCPUAverage: AggValue;
  processCPUMax: AggValue;
}

export async function fetch(setup: Setup, serviceName: string) {
  const { start, end, uiFiltersES, client, config } = setup;

  const aggs = {
    systemCPUAverage: { avg: { field: METRIC_SYSTEM_CPU_PERCENT } },
    systemCPUMax: { max: { field: METRIC_SYSTEM_CPU_PERCENT } },
    processCPUAverage: { avg: { field: METRIC_PROCESS_CPU_PERCENT } },
    processCPUMax: { max: { field: METRIC_PROCESS_CPU_PERCENT } }
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

  return client.search<void, MetricsAggs<CPUMetrics>>(params);
}
