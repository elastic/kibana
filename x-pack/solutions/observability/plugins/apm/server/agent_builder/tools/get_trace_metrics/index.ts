/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type { ApmDataAccessServices } from '@kbn/apm-data-access-plugin/server';
import { getPreferredBucketSizeAndDataSource } from '@kbn/apm-data-access-plugin/common';
import type { ApmDocumentType } from '../../../../common/document_type';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';
import { calculateThroughputWithRange } from '../../../lib/helpers/calculate_throughput';
import { getDurationFieldForTransactions } from '../../../lib/helpers/transactions';
import { getBucketSize } from '../../../../common/utils/get_bucket_size';

const MAX_NUMBER_OF_GROUPS = 100;

export interface TraceMetricsItem {
  group: string;
  latency: number | null;
  throughput: number;
  failureRate: number;
}

export type GetTraceMetricsResponse = TraceMetricsItem[];

/**
 * Gets the preferred document source based on groupBy, filter, and data availability.
 *
 * Uses getDocumentSources to determine which document types have data for the given
 * filter and groupBy field. This automatically handles:
 * - ServiceTransactionMetric: Most efficient, but only has service.name, service.environment, transaction.type
 * - TransactionMetric: Has more dimensions (transaction.*, host.*, container.*, kubernetes.*, cloud.*, faas.*, etc.)
 * - TransactionEvent: Raw transaction docs, fallback when metrics don't have required fields
 */
async function getPreferredDocumentSource({
  apmDataAccessServices,
  start,
  end,
  groupBy,
  kqlFilter,
}: {
  apmDataAccessServices: ApmDataAccessServices;
  start: number;
  end: number;
  groupBy: string;
  kqlFilter?: string;
}) {
  const kueryParts: string[] = [];
  if (kqlFilter) {
    kueryParts.push(kqlFilter);
  }
  kueryParts.push(`${groupBy}: *`);
  const kuery = kueryParts.join(' AND ');

  const documentSources = await apmDataAccessServices.getDocumentSources({
    start,
    end,
    kuery,
  });

  const { bucketSize } = getBucketSize({
    start,
    end,
    numBuckets: 100,
  });

  const { source } = getPreferredBucketSizeAndDataSource({
    sources: documentSources,
    bucketSizeInSeconds: bucketSize,
  });

  return source;
}

export async function getTraceMetrics({
  apmEventClient,
  apmDataAccessServices,
  start,
  end,
  kqlFilter,
  groupBy,
}: {
  apmEventClient: APMEventClient;
  apmDataAccessServices: ApmDataAccessServices;
  start: number;
  end: number;
  kqlFilter?: string;
  groupBy: string;
}): Promise<GetTraceMetricsResponse> {
  const source = await getPreferredDocumentSource({
    apmDataAccessServices,
    start,
    end,
    groupBy,
    kqlFilter,
  });

  const { rollupInterval, hasDurationSummaryField } = source;
  const documentType = source.documentType as
    | ApmDocumentType.ServiceTransactionMetric
    | ApmDocumentType.TransactionMetric
    | ApmDocumentType.TransactionEvent;

  const durationField = getDurationFieldForTransactions(documentType, hasDurationSummaryField);
  const outcomeAggs = getOutcomeAggregation(documentType);

  const response = await apmEventClient.search('get_trace_metrics', {
    apm: {
      sources: [{ documentType, rollupInterval }],
    },
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...kqlQuery(kqlFilter)],
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

  const items: TraceMetricsItem[] = buckets.map((bucket) => {
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
