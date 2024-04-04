/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { termQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType } from '../../../../common/document_type';
import {
  TRANSACTION_DURATION_HISTOGRAM,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { RollupInterval } from '../../../../common/rollup';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getLatencyAggregation } from '../../../lib/helpers/latency_aggregation_type';
import { fetchSeries } from './fetch_timeseries';

export async function getTransactionLatency({
  apmEventClient,
  start,
  end,
  intervalString,
  filter,
  transactionType,
  latencyAggregationType,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  intervalString: string;
  bucketSize: number;
  filter: QueryDslQueryContainer[];
  transactionType?: string;
  latencyAggregationType: LatencyAggregationType;
}) {
  return (
    await fetchSeries({
      apmEventClient,
      start,
      end,
      operationName: 'assistant_get_transaction_latency',
      unit: 'ms',
      documentType: ApmDocumentType.TransactionMetric,
      rollupInterval: RollupInterval.OneMinute,
      intervalString,
      filter: filter.concat(...termQuery(TRANSACTION_TYPE, transactionType)),
      groupBy: 'transaction.type',
      aggs: {
        ...getLatencyAggregation(
          latencyAggregationType,
          TRANSACTION_DURATION_HISTOGRAM
        ),
        value: {
          bucket_script: {
            buckets_path: {
              latency: 'latency',
            },
            script: 'params.latency / 1000',
          },
        },
      },
    })
  ).map((fetchedSerie) => {
    return {
      ...fetchedSerie,
      data: fetchedSerie.data.map((bucket) => {
        return {
          x: bucket.key,
          y: bucket.value?.value as number | null,
        };
      }),
    };
  });
}
