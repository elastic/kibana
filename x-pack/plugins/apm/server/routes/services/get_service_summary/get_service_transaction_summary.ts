/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ApmServiceTransactionDocumentType } from '../../../../common/document_type';
import { Environment } from '../../../../common/environment_rt';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { RollupInterval } from '../../../../common/rollup';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import {
  calculateThroughputWithInterval,
  calculateThroughputWithRange,
} from '../../../lib/helpers/calculate_throughput';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getMetricsDateHistogramParams } from '../../../lib/helpers/metrics';
import { getDurationFieldForTransactions } from '../../../lib/helpers/transactions';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';

export interface ServiceSummaryTransactionStats {
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
}

export async function getServiceTransactionSummary({
  apmEventClient,
  documentType,
  rollupInterval,
  bucketSizeInSeconds,
  serviceName,
  start,
  end,
  environment,
  transactionType,
}: {
  apmEventClient: APMEventClient;
  documentType: ApmServiceTransactionDocumentType;
  rollupInterval: RollupInterval;
  bucketSizeInSeconds: number;
  serviceName: string;
  start: number;
  end: number;
  environment: Environment;
  transactionType: string;
}): Promise<ServiceSummaryTransactionStats> {
  const statisticAggs = {
    latency: {
      avg: {
        field: getDurationFieldForTransactions(documentType),
      },
    },
    count: {
      value_count: {
        field: getDurationFieldForTransactions(documentType),
      },
    },
    ...getOutcomeAggregation(documentType),
  };

  const response = await apmEventClient.search(
    'get_service_summary_transaction_timeseries',
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
              ...termQuery(TRANSACTION_TYPE, transactionType),
            ],
          },
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
    }
  );

  return {
    latency: {
      value: response.aggregations?.latency.value ?? null,
      timeseries:
        response.aggregations?.timeseries.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.latency.value,
        })) ?? null,
    },
    throughput: {
      value: isFiniteNumber(response.aggregations?.count.value)
        ? calculateThroughputWithRange({
            value: response.aggregations!.count.value,
            start,
            end,
          })
        : null,
      timeseries:
        response.aggregations?.timeseries.buckets.map((bucket) => ({
          x: bucket.key,
          y: calculateThroughputWithInterval({
            value: bucket.count.value,
            bucketSize: bucketSizeInSeconds,
          }),
        })) ?? null,
    },
    failureRate: {
      value: response.aggregations
        ? calculateFailedTransactionRate(response.aggregations)
        : null,
      timeseries:
        response.aggregations?.timeseries.buckets.map((bucket) => ({
          x: bucket.key,
          y: calculateFailedTransactionRate(bucket),
        })) ?? null,
    },
  };
}
