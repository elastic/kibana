/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { Node } from '../../../../common/connections';
import {
  ApmDocumentType,
  ApmServiceDestinationDocumentType,
} from '../../../../common/document_type';
import { Environment } from '../../../../common/environment_rt';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '../../../../common/es_fields/apm';
import { RollupInterval } from '../../../../common/rollup';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { getDestinationMap } from '../../../lib/connections/get_connection_stats/get_destination_map';
import {
  calculateThroughputWithInterval,
  calculateThroughputWithRange,
} from '../../../lib/helpers/calculate_throughput';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getMetricsDateHistogramParams } from '../../../lib/helpers/metrics';
import {
  getDurationCountFieldForExitSpans,
  getDurationSumFieldForExitSpans,
} from '../../../lib/helpers/transactions';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';

export type ServiceSummaryServiceDestinationStats = Array<{
  destination:
    | {
        address: string;
      }
    | (Node & { address: string });
  latency: {
    value: number | null;
    timeseries: Array<{ x: number; y: number | null }> | null;
  };
  throughput: {
    value: number | null;
    timeseries: Array<{ x: number; y: number | null }> | null;
  };
  failureRate: {
    value: number | null;
    timeseries: Array<{ x: number; y: number | null }> | null;
  };
}>;

interface SharedProps {
  apmEventClient: APMEventClient;
  documentType: ApmServiceDestinationDocumentType;
  rollupInterval: RollupInterval;
  serviceName: string;
  start: number;
  end: number;
  environment: Environment;
}

async function getStats({
  apmEventClient,
  documentType,
  rollupInterval,
  serviceName,
  start,
  end,
  environment,
  bucketSizeInSeconds,
}: SharedProps & { bucketSizeInSeconds: number }) {
  const statisticAggs = {
    latencySum: {
      sum: {
        field: getDurationSumFieldForExitSpans(documentType),
      },
    },
    count:
      documentType === ApmDocumentType.SpanEvent
        ? {
            value_count: {
              field: getDurationCountFieldForExitSpans(documentType),
            },
          }
        : { sum: { field: getDurationCountFieldForExitSpans(documentType) } },
    ...getOutcomeAggregation(documentType),
  };

  const response = await apmEventClient.search(
    'get_service_summary_service_destination_timeseries',
    {
      apm: {
        sources: [{ documentType, rollupInterval }],
      },
      body: {
        size: 0,
        track_total_hits: false,
        query: {
          bool: {
            filter: [
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...termQuery(SERVICE_NAME, serviceName),
            ],
          },
        },
        aggs: {
          by_destination: {
            terms: {
              field: SPAN_DESTINATION_SERVICE_RESOURCE,
              size: 1000,
            },
            aggs: {
              ...statisticAggs,
              timeseries: {
                date_histogram: getMetricsDateHistogramParams({
                  start,
                  end,
                  bucketSizeInSeconds,
                }),
                aggs: statisticAggs,
              },
            },
          },
        },
      },
    }
  );

  return (response.aggregations?.by_destination.buckets || []).map(
    (bucket) => ({
      destination: {
        address: bucket.key as string,
      },
      latency: {
        value: (bucket.latencySum.value ?? 0) / (bucket.count.value ?? 0),
        timeseries:
          bucket.timeseries.buckets.map((dateBucket) => ({
            x: dateBucket.key,
            y:
              (dateBucket.latencySum.value ?? 0) /
              (dateBucket.count.value ?? 0),
          })) ?? null,
      },
      throughput: {
        value: isFiniteNumber(bucket.count.value)
          ? calculateThroughputWithRange({
              value: bucket.count.value,
              start,
              end,
            })
          : null,
        timeseries:
          bucket.timeseries.buckets.map((dateBucket) => ({
            x: dateBucket.key,
            y: calculateThroughputWithInterval({
              value: dateBucket.count.value ?? 0,
              bucketSize: bucketSizeInSeconds,
            }),
          })) ?? null,
      },
      failureRate: {
        value: response.aggregations
          ? calculateFailedTransactionRate(bucket)
          : null,
        timeseries: bucket.timeseries.buckets.map((dateBucket) => ({
          x: dateBucket.key,
          y: calculateFailedTransactionRate(dateBucket),
        })),
      },
    })
  );
}

export async function getServiceSummaryServiceDestinationStats({
  apmEventClient,
  documentType,
  rollupInterval,
  bucketSizeInSeconds,
  serviceName,
  start,
  end,
  environment,
}: {
  apmEventClient: APMEventClient;
  documentType: ApmServiceDestinationDocumentType;
  rollupInterval: RollupInterval;
  bucketSizeInSeconds: number;
  serviceName: string;
  start: number;
  end: number;
  environment: Environment;
}): Promise<ServiceSummaryServiceDestinationStats> {
  const [stats, destinationMap] = await Promise.all([
    getStats({
      apmEventClient,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
      serviceName,
      start,
      end,
      environment,
    }),
    getDestinationMap({
      apmEventClient,
      start,
      end,
      filter: [
        ...termQuery(SERVICE_NAME, serviceName),
        ...environmentQuery(environment),
      ],
    }),
  ]);

  return stats.map((stat) => {
    const node = destinationMap.get(stat.destination.address);
    return {
      ...stat,
      destination: {
        ...node,
        address: stat.destination.address,
      },
    };
  });
}
