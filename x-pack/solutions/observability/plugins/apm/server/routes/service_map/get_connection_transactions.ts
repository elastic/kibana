/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calculateFailedTransactionRate,
  calculateThroughputWithRange,
  getOutcomeAggregation,
} from '@kbn/apm-data-access-plugin/server/utils';
import { LatencyAggregationType } from '@kbn/apm-types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import type { ConnectionTransactionsResponse } from '@kbn/apm-api-shared';
import { ApmDocumentType } from '../../../common/document_type';
import {
  PARENT_ID,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { Environment } from '../../../common/environment_rt';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getLatencyAggregation, getLatencyValue } from '../../lib/helpers/latency_aggregation_type';
import { withApmSpan } from '../../utils/with_apm_span';

/**
 * Maximum number of IDs collected from Phase 1.
 * This is an intentional PoC constraint — values are biased for high-volume connections.
 * See kibana#293244 concern #1 in the PR description.
 */
const MAX_IDS = 1000;

/** Maximum number of distinct transaction name groups returned in Phase 2. */
const MAX_TRANSACTION_GROUPS = 100;

export function getConnectionTransactions({
  apmEventClient,
  sourceServiceName,
  targetServiceName,
  dependencies,
  environment,
  start,
  end,
  latencyAggregationType = LatencyAggregationType.avg,
}: {
  apmEventClient: APMEventClient;
  sourceServiceName: string;
  /** Present for service→service edges. Triggers parent-span Phase 1 instead of resource-based. */
  targetServiceName?: string;
  dependencies: string[];
  environment: Environment;
  start: number;
  end: number;
  latencyAggregationType?: LatencyAggregationType;
}): Promise<ConnectionTransactionsResponse> {
  return withApmSpan('get_connection_transactions', async () => {
    // trace.id is present on both APM-native and OTel-native spans/transactions,
    // while transaction.id is absent on OTel exit spans. Using trace.id for the join
    // means Phase 2 may include extra transactions in multi-tx traces (PoC trade-off).
    let traceIds: string[];
    let isMaxTransactionsReached: boolean;

    if (targetServiceName) {
      //
      // Service→service Phase 1: parent-span join.
      //
      // A trace-level join (find sourceService tx IDs in any trace that also contains
      // targetService) is too broad: in multi-hop traces like A→B→C it would incorrectly
      // include A→B transactions even when A never calls C directly.
      //
      // A parent-span join is precise: every targetService entry transaction has a
      // parent.id that is the span.id of the exit span in sourceService that created it.
      // Collecting those parent.id values and then looking up which sourceService
      // transactions contain those span IDs gives exactly the sourceService transactions
      // that directly called targetService.
      //
      // Phase 1a: collect the parent.id values of targetService entry transactions.
      // These are the span.id values of exit spans in sourceService.
      const targetEntryResponse = await apmEventClient.search(
        'get_connection_transactions_target_parent_ids',
        {
          apm: { events: [ProcessorEvent.transaction] },
          track_total_hits: false,
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { [SERVICE_NAME]: targetServiceName } },
                { exists: { field: PARENT_ID } },
                ...rangeQuery(start, end),
                ...environmentQuery(environment),
              ],
            },
          },
          aggs: {
            parent_ids: {
              terms: { field: PARENT_ID, size: MAX_IDS },
            },
          },
        }
      );

      const parentIds = (targetEntryResponse.aggregations?.parent_ids.buckets ?? []).map((b) =>
        String(b.key)
      );

      if (parentIds.length === 0) {
        return { transactionGroups: [], isMaxTransactionsReached: false };
      }

      // Phase 1b: find sourceService spans whose span.id is in parentIds, then collect
      // the trace.id. Using trace.id (not transaction.id) so OTel exit spans — which lack
      // transaction.id — are handled correctly. Phase 2 filters by trace.id + service.name.
      const sourceTxResponse = await apmEventClient.search(
        'get_connection_transactions_source_tx_ids',
        {
          apm: { events: [ProcessorEvent.span, ProcessorEvent.transaction] },
          track_total_hits: false,
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { [SERVICE_NAME]: sourceServiceName } },
                { terms: { [SPAN_ID]: parentIds } },
                ...rangeQuery(start, end),
                ...environmentQuery(environment),
              ],
            },
          },
          aggs: {
            trace_ids: {
              terms: { field: TRACE_ID, size: MAX_IDS },
            },
          },
        }
      );

      const sourceBuckets = sourceTxResponse.aggregations?.trace_ids.buckets ?? [];
      traceIds = sourceBuckets.map((b) => String(b.key));
      isMaxTransactionsReached = parentIds.length >= MAX_IDS || traceIds.length >= MAX_IDS;
    } else {
      //
      // Service→dependency Phase 1: resource-based join.
      //
      // Spans have `trace.id` but NOT `transaction.name`.
      // Transaction docs have `transaction.name` but NOT `span.destination.service.resource`.
      // So we do a two-phase join on trace.id — present on both APM-native and OTel-native
      // spans — then filter in Phase 2 by service.name + trace.id to find the right transactions.
      //
      // We query BOTH span and transaction documents. The service map's own exit span query
      // (fetch_exit_span_samples.ts) does the same — in some cases (single-span transactions,
      // certain agent types) `span.destination.service.resource` appears on a transaction
      // document rather than a span document.
      //
      const spanAggResponse = await apmEventClient.search(
        'get_connection_transactions_exit_span_ids',
        {
          apm: {
            events: [ProcessorEvent.span, ProcessorEvent.transaction],
          },
          track_total_hits: false,
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { [SERVICE_NAME]: sourceServiceName } },
                { terms: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencies } },
                ...rangeQuery(start, end),
                ...environmentQuery(environment),
              ],
            },
          },
          aggs: {
            trace_ids: {
              terms: {
                field: TRACE_ID,
                size: MAX_IDS,
              },
            },
          },
        }
      );

      const buckets = spanAggResponse.aggregations?.trace_ids.buckets ?? [];
      traceIds = buckets.map((b) => String(b.key));
      isMaxTransactionsReached = traceIds.length >= MAX_IDS;
    }

    if (traceIds.length === 0) {
      return { transactionGroups: [], isMaxTransactionsReached: false };
    }

    //
    // Phase 2: Aggregate transaction docs by transaction.name.
    //
    const outcomes = getOutcomeAggregation(ApmDocumentType.TransactionEvent);

    const txAggResponse = await apmEventClient.search('get_connection_transactions_groups', {
      apm: {
        events: [ProcessorEvent.transaction],
      },
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: sourceServiceName } },
            { terms: { [TRACE_ID]: traceIds } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
          ],
        },
      },
      aggs: {
        transaction_groups: {
          terms: {
            field: TRANSACTION_NAME,
            size: MAX_TRANSACTION_GROUPS,
          },
          aggs: {
            ...outcomes,
            ...getLatencyAggregation(latencyAggregationType, TRANSACTION_DURATION),
            transaction_type: {
              terms: {
                field: TRANSACTION_TYPE,
                size: 1,
              },
            },
          },
        },
      },
    });

    const groups = txAggResponse.aggregations?.transaction_groups.buckets ?? [];

    const transactionGroups = groups.map((bucket) => {
      const totalCount = bucket.doc_count;
      const latencyRaw = bucket.latency;
      const latency = latencyRaw
        ? getLatencyValue({
            latencyAggregationType,
            aggregation: latencyRaw as
              | { value: number | null }
              | { values: Record<string, number | null> },
          })
        : null;

      const errorRate = calculateFailedTransactionRate(bucket);
      const throughput = calculateThroughputWithRange({
        start,
        end,
        value: totalCount,
      });

      const transactionType = String((bucket as any).transaction_type?.buckets?.[0]?.key ?? '');

      return {
        name: String(bucket.key),
        transactionType,
        latency,
        throughput,
        errorRate,
        isSampled: isMaxTransactionsReached,
      };
    });

    return { transactionGroups, isMaxTransactionsReached };
  });
}
