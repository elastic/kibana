/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { SERVICE_NAME, TRANSACTION_NAME } from '../../../../common/es_fields/apm';
import { ApmDocumentType } from '../../../../common/document_type';
import { getRollupIntervalForTimeRange } from '../../../agent_builder/utils/get_rollup_interval_for_time_range';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';
import { calculateThroughputWithRange } from '../../../lib/helpers/calculate_throughput';
import { getDurationFieldForTransactions } from '../../../lib/helpers/transactions';

const MAX_NUMBER_OF_GROUPS = 100;

export interface RedMetricsItem {
  group: string;
  latency: number | null;
  throughput: number;
  failureRate: number;
}

export type GetRedMetricsResponse = RedMetricsItem[];

/**
 * Determines the appropriate document type based on groupBy and filter parameters.
 * ServiceTransactionMetric is more efficient but doesn't have 'transaction.name'.
 * Use TransactionMetric when filtering or grouping by transaction.name.
 */
function getDocumentType(
  groupBy: string,
  filter?: string
): ApmDocumentType.TransactionMetric | ApmDocumentType.ServiceTransactionMetric {
  const requiresTransactionName =
    groupBy === TRANSACTION_NAME || (filter && filter.includes(TRANSACTION_NAME));

  return requiresTransactionName
    ? ApmDocumentType.TransactionMetric
    : ApmDocumentType.ServiceTransactionMetric;
}

export async function getRedMetrics({
  apmEventClient,
  start,
  end,
  filter,
  groupBy = SERVICE_NAME,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  filter?: string;
  groupBy?: string;
}): Promise<GetRedMetricsResponse> {
  const documentType = getDocumentType(groupBy, filter);
  const rollupInterval = getRollupIntervalForTimeRange(start, end);
  const durationField = getDurationFieldForTransactions(documentType, true);

  const outcomeAggs = getOutcomeAggregation(documentType);

  const response = await apmEventClient.search('get_service_red_metrics', {
    apm: {
      sources: [{ documentType, rollupInterval }],
    },
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...kqlQuery(filter)],
      },
    },
    aggs: {
      groups: {
        terms: {
          field: groupBy,
          size: MAX_NUMBER_OF_GROUPS,
        },
        aggs: {
          avg_latency: {
            avg: {
              field: durationField,
            },
          },
          ...outcomeAggs,
        },
      },
    },
  });

  const buckets = response.aggregations?.groups?.buckets ?? [];

  const items: RedMetricsItem[] = buckets.map((bucket) => {
    const docCount = bucket.doc_count;
    const latencyValue = bucket.avg_latency?.value;

    const latencyMs =
      latencyValue !== null && latencyValue !== undefined ? latencyValue / 1000 : null;

    const failureRate = calculateFailedTransactionRate(bucket);

    const throughput = calculateThroughputWithRange({
      start,
      end,
      value: docCount,
    });

    return {
      group: bucket.key as string,
      latency: latencyMs,
      throughput,
      failureRate,
    };
  });

  return items;
}
