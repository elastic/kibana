/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  SERVICE_AGENT_NAME,
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../../../helpers/setup_request';
import { JavaGcMetricsAggs, MetricSeriesKeys, AggValue } from '../../../types';
import { getMetricsDateHistogramParams } from '../../../../helpers/metrics';
import { rangeFilter } from '../../../../helpers/range_filter';

export interface GcTimeMetrics extends MetricSeriesKeys {
  gcTimeAll: AggValue;
}

export async function fetch(setup: Setup, serviceName: string) {
  const { start, end, uiFiltersES, client, config } = setup;

  const aggs = {
    gcTimeMax: {
      max: {
        field: 'jvm.gc.time'
      }
    },
    gcTimeAll: {
      derivative: {
        buckets_path: 'gcTimeMax'
      }
    },
    gcTime: {
      bucket_script: {
        buckets_path: {
          value: 'gcTimeMax'
        },
        script: 'params.value > 0.0 ? params.value : 0.0'
      }
    }
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
            { term: { [SERVICE_AGENT_NAME]: 'java' } },
            { range: rangeFilter(start, end) },
            ...uiFiltersES
          ]
        }
      },
      aggs: {
        perAgent: {
          terms: {
            field: 'agent.ephemeral_id',
            size: 10
          },
          aggs: {
            timeseriesData: {
              date_histogram: getMetricsDateHistogramParams(start, end),
              aggs
            },
            gcTimeAll: {
              sum_bucket: {
                buckets_path: 'timeseriesData>gcTimeAll'
              }
            }
          }
        }
      }
    }
  };

  return client.search<void, JavaGcMetricsAggs<GcTimeMetrics>>(params);
}
