/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { APMAnomalyTimeseries } from '../../../common/anomaly_detection/apm_anomaly_timeseries';
import { Node } from '../../../common/connections';
import {
  EVENT_OUTCOME,
  METRICSET_NAME,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
  SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
  TRANSACTION_DURATION_HISTOGRAM,
} from '../../../common/elasticsearch_fieldnames';
import { Environment } from '../../../common/environment_rt';
import { EventOutcome } from '../../../common/event_outcome';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import { apmMlAnomalyQuery } from '../../lib/anomaly_detection/apm_ml_anomaly_query';
import { getAnomalyTimeseries } from '../../lib/anomaly_detection/get_anomaly_timeseries';
import { getDestinationMap } from '../../lib/connections/get_connection_stats/get_destination_map';
import { calculateThroughputWithInterval } from '../../lib/helpers/calculate_throughput';
import { getBucketSize } from '../../lib/helpers/get_bucket_size';
import { getMetricsDateHistogramParams } from '../../lib/helpers/metrics';
import { Setup } from '../../lib/helpers/setup_request';

type SpanMetricSeries = Array<{
  x: number;
  spanRate: number;
  spanLatency: number | null;
  spanFailureRate: number;
}>;

type TransactionMetricSeries = Array<{
  x: number;
  transactionRate: number;
  transactionLatency: number | null;
  transactionFailureRate: number;
}>;

export interface TimelineChartsResponse {
  spanMetricsSeries: Record<string, SpanMetricSeries>;
  transactionMetrics: TransactionMetricSeries;
  anomalySeries: APMAnomalyTimeseries[];
  intervalString: string;
  destinationMap: Record<string, Node>;
}

interface Params {
  setup: Setup;
  environment: Environment;
  start: number;
  end: number;
  serviceName: string;
  logger: Logger;
}

interface SubQueryParams extends Params {
  bucketSize: number;
  intervalString: string;
}

async function getSpanMetrics({
  setup,
  environment,
  start,
  end,
  serviceName,
  bucketSize,
}: SubQueryParams) {
  const sharedAggs = {
    total_count: {
      sum: {
        field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_COUNT,
      },
    },
  };

  const response = await setup.apmEventClient.search(
    'get_span_metrics_for_timeline',
    {
      apm: {
        events: [ProcessorEvent.metric],
      },
      body: {
        query: {
          bool: {
            filter: [
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...termQuery(METRICSET_NAME, 'service_destination'),
              ...termQuery(SERVICE_NAME, serviceName),
            ],
          },
        },
        size: 0,
        aggs: {
          by_destination: {
            terms: {
              field: SPAN_DESTINATION_SERVICE_RESOURCE,
              size: 100,
            },
            aggs: {
              over_time: {
                date_histogram: getMetricsDateHistogramParams({
                  start,
                  end,
                  metricsInterval: 60,
                }),
                aggs: {
                  ...sharedAggs,
                  total_latency: {
                    sum: {
                      field: SPAN_DESTINATION_SERVICE_RESPONSE_TIME_SUM,
                    },
                  },
                  successful: {
                    filter: {
                      term: {
                        [EVENT_OUTCOME]: EventOutcome.success,
                      },
                    },
                    aggs: {
                      ...sharedAggs,
                    },
                  },
                  failed: {
                    filter: {
                      term: {
                        [EVENT_OUTCOME]: EventOutcome.failure,
                      },
                    },
                    aggs: {
                      ...sharedAggs,
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
  );

  const series: Record<string, SpanMetricSeries> = {};

  response.aggregations?.by_destination.buckets.forEach((bucket) => {
    const destination = String(bucket.key);

    series[destination] = bucket.over_time.buckets.map((dateBucket) => {
      const successful = dateBucket.successful.total_count.value ?? 0;
      const failed = dateBucket.failed.total_count.value ?? 0;
      const totalCount = dateBucket.total_count.value ?? 0;
      const totalLatency = dateBucket.total_latency.value ?? 0;
      return {
        x: dateBucket.key,
        destination: bucket.key as string,
        spanRate: calculateThroughputWithInterval({
          bucketSize,
          value: totalCount,
        }),
        spanLatency: totalLatency / totalCount,
        spanFailureRate: failed / (successful + failed),
      };
    });
  });

  return series;
}

async function getTransactionMetrics({
  setup,
  start,
  end,
  environment,
  serviceName,
  bucketSize,
}: SubQueryParams) {
  const response = await setup.apmEventClient.search(
    'get_transaction_metrics_for_timeline',
    {
      apm: {
        events: [ProcessorEvent.metric],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...environmentQuery(environment),
              ...rangeQuery(start, end),
              ...termQuery(METRICSET_NAME, 'transaction'),
              ...termQuery(SERVICE_NAME, serviceName),
            ],
          },
        },
        aggs: {
          over_time: {
            date_histogram: getMetricsDateHistogramParams({
              start,
              end,
              metricsInterval: 60,
            }),
            aggs: {
              avg_latency: {
                avg: { field: TRANSACTION_DURATION_HISTOGRAM },
              },
              successful: {
                filter: {
                  term: {
                    [EVENT_OUTCOME]: EventOutcome.success,
                  },
                },
              },
              failed: {
                filter: {
                  term: {
                    [EVENT_OUTCOME]: EventOutcome.failure,
                  },
                },
              },
            },
          },
        },
      },
    }
  );

  return (
    response.aggregations?.over_time.buckets.map((dateBucket) => {
      const successful = dateBucket.successful.doc_count;
      const failed = dateBucket.successful.doc_count;
      const totalCount = dateBucket.doc_count;
      const avgLatency = dateBucket.avg_latency.value;

      return {
        x: dateBucket.key,
        transactionRate: calculateThroughputWithInterval({
          value: totalCount,
          bucketSize,
        }),
        transactionLatency: avgLatency,
        transactionFailureRate: failed / (successful + failed),
      };
    }) ?? []
  );
}

async function getAnomalies(params: SubQueryParams) {
  const {
    start,
    end,
    environment,
    serviceName,
    setup: { ml },
    logger,
  } = params;

  if (!ml) {
    return [];
  }

  return getAnomalyTimeseries({
    query: apmMlAnomalyQuery({
      partitionField: serviceName,
    }),
    start,
    end,
    environment,
    mlSetup: ml,
    logger,
  });
}

export async function getTimelineCharts(
  params: Params
): Promise<TimelineChartsResponse> {
  const { setup, start, end, serviceName } = params;
  const bucketSizeOptions = getBucketSize({
    start,
    end,
  });

  const nextParams = { ...params, ...bucketSizeOptions };

  const [spanMetricsSeries, transactionMetrics, anomalySeries, destinationMap] =
    await Promise.all([
      getSpanMetrics(nextParams),
      getTransactionMetrics(nextParams),
      getAnomalies(nextParams),
      getDestinationMap({
        setup,
        start,
        end,
        filter: termQuery(SERVICE_NAME, serviceName),
      }),
    ]);

  return {
    spanMetricsSeries,
    transactionMetrics,
    anomalySeries,
    intervalString: bucketSizeOptions.intervalString,
    destinationMap: Object.fromEntries(destinationMap.entries()),
  };
}
