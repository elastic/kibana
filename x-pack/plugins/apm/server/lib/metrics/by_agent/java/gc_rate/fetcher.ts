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

export interface GcRateMetrics extends MetricSeriesKeys {
  gcCountMax: AggValue;
  gcCountAvg: AggValue;
}

export async function fetch(setup: Setup, serviceName: string) {
  const { start, end, uiFiltersES, client, config } = setup;

  const aggs = {
    gcCountMaxSeq: {
      max: {
        field: 'jvm.gc.count'
      }
    },
    gcCountMaxSeqNatural: {
      bucket_script: {
        buckets_path: {
          value: 'gcCountMaxSeq'
        },
        script: 'params.value > 0.0 ? params.value : 0.0'
      }
    },
    gcCountMax: {
      serial_diff: {
        buckets_path: 'gcCountMaxSeqNatural'
      }
    },
    gcCountAvgSeq: {
      avg: {
        field: 'jvm.gc.count'
      }
    },
    gcCountAvgSeqNatural: {
      bucket_script: {
        buckets_path: {
          value: 'gcCountAvgSeq'
        },
        script: 'params.value > 0.0 ? params.value : 0.0'
      }
    },
    gcCountAvg: {
      serial_diff: {
        buckets_path: 'gcCountAvgSeqNatural'
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
        perLabelName: {
          terms: {
            field: 'labels.name',
            size: 10
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
                gcCountMax: {
                  max_bucket: {
                    buckets_path: 'timeseriesData>gcCountMax'
                  }
                },
                gcCountAvg: {
                  avg_bucket: {
                    buckets_path: 'timeseriesData>gcCountAvg'
                  }
                }
              }
            }
          }
        }
      }
    }
  };
  return client.search<void, JavaGcMetricsAggs<GcRateMetrics>>(params);
}
