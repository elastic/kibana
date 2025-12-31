/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type { ApmDataAccessServices } from '@kbn/apm-data-access-plugin/server';
import { getPreferredBucketSizeAndDataSource } from '@kbn/apm-data-access-plugin/common';
import {
  CLOUD,
  CONTAINER,
  HOST,
  KUBERNETES,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_VERSION,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
} from '../../../../common/es_fields/apm';
import { ApmDocumentType } from '../../../../common/document_type';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';
import { calculateThroughputWithRange } from '../../../lib/helpers/calculate_throughput';
import { getDurationFieldForTransactions } from '../../../lib/helpers/transactions';
import { getBucketSize } from '../../../../common/utils/get_bucket_size';

const MAX_NUMBER_OF_GROUPS = 100;

/**
 * Fields that exist in TransactionMetric but NOT in ServiceTransactionMetric.
 * When grouping or filtering by these fields, TransactionMetric (or TransactionEvent) is used.
 */
const TRANSACTION_METRIC_ONLY_FIELDS = [
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  `${HOST}.`,
  `${CONTAINER}.`,
  `${KUBERNETES}.`,
  `${CLOUD}.`,
  'faas.',
  SERVICE_NODE_NAME,
  SERVICE_VERSION,
  SERVICE_RUNTIME_NAME,
];

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
 * Document type preference:
 * - ServiceTransactionMetric: Most efficient, but only has service.name, service.environment, transaction.type
 * - TransactionMetric: Has more dimensions (transaction.*, host.*, container.*, kubernetes.*, cloud.*, faas.*, service.node.name, service.version)
 * - TransactionEvent: Raw transaction docs, fallback when metrics don't have data (needed for high-cardinality fields like labels.*)
 */
async function getPreferredDocumentSource({
  apmDataAccessServices,
  start,
  end,
  groupBy,
  filter,
}: {
  apmDataAccessServices: ApmDataAccessServices;
  start: number;
  end: number;
  groupBy: string;
  filter?: string;
}) {
  const requiresTransactionMetric = TRANSACTION_METRIC_ONLY_FIELDS.some(
    (field) => groupBy.startsWith(field) || (filter && filter.includes(field))
  );

  const documentSources = await apmDataAccessServices.getDocumentSources({
    start,
    end,
    kuery: filter ?? '',
  });

  const suitableDocumentTypes = requiresTransactionMetric
    ? [ApmDocumentType.TransactionMetric, ApmDocumentType.TransactionEvent]
    : [
        ApmDocumentType.ServiceTransactionMetric,
        ApmDocumentType.TransactionMetric,
        ApmDocumentType.TransactionEvent,
      ];

  const suitableDocumentSources = documentSources.filter((source) =>
    suitableDocumentTypes.includes(source.documentType)
  );

  const { bucketSize } = getBucketSize({
    start,
    end,
    numBuckets: 100,
  });

  const { source } = getPreferredBucketSizeAndDataSource({
    sources: suitableDocumentSources,
    bucketSizeInSeconds: bucketSize,
  });

  return source;
}

export async function getTraceMetrics({
  apmEventClient,
  apmDataAccessServices,
  start,
  end,
  filter,
  groupBy = SERVICE_NAME,
}: {
  apmEventClient: APMEventClient;
  apmDataAccessServices: ApmDataAccessServices;
  start: number;
  end: number;
  filter?: string;
  groupBy?: string;
}): Promise<GetTraceMetricsResponse> {
  const source = await getPreferredDocumentSource({
    apmDataAccessServices,
    start,
    end,
    groupBy,
    filter,
  });

  const { documentType, rollupInterval, hasDurationSummaryField } = source;

  const durationField = getDurationFieldForTransactions(
    documentType as
      | ApmDocumentType.ServiceTransactionMetric
      | ApmDocumentType.TransactionMetric
      | ApmDocumentType.TransactionEvent,
    hasDurationSummaryField
  );
  const outcomeAggs = getOutcomeAggregation(documentType);

  const response = await apmEventClient.search('get_trace_metrics', {
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
