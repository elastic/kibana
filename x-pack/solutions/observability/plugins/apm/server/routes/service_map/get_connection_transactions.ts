/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import type { ConnectionTransactionsResponse } from '@kbn/apm-api-shared';
import {
  EVENT_OUTCOME,
  PARENT_ID,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  TRACE_ID,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { EventOutcome } from '../../../common/event_outcome';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { Environment } from '../../../common/environment_rt';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { withApmSpan } from '../../utils/with_apm_span';

/**
 * Maximum number of IDs collected from Phase 1 (service→service parent-span join).
 * Biases results on very high-volume connections. See kibana#293244.
 */
const MAX_IDS = 1000;

/** Maximum distinct endpoint (transaction name) groups returned. */
const MAX_TRANSACTION_GROUPS = 100;

/**
 * Sentinel used as the `missing` parameter on the transaction.name terms agg so that
 * OTel exit spans (which lack transaction.name) are collected in their own bucket.
 */
const OTEL_MISSING_KEY = '__otel_tx_name_missing__';

export function getConnectionTransactions({
  apmEventClient,
  sourceServiceName,
  targetServiceName,
  dependencies,
  environment,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  sourceServiceName: string;
  /** Present for service→service edges. Triggers parent-span Phase 1 instead of resource-based. */
  targetServiceName?: string;
  dependencies: string[];
  environment: Environment;
  start: number;
  end: number;
}): Promise<ConnectionTransactionsResponse> {
  return withApmSpan('get_connection_transactions', async () => {
    // -----------------------------------------------------------------------
    // Phase 1 (service→service): collect parent.id of s2 entry transactions.
    // These are the span.id values of s1 exit spans that directly called s2.
    // This join excludes s1→s3→s2 paths (Phase 1a exit spans are in s1 only).
    // -----------------------------------------------------------------------
    let scopeFilter: Array<Record<string, unknown>>;
    let isMaxTransactionsReached = false;

    if (targetServiceName) {
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

      isMaxTransactionsReached = parentIds.length >= MAX_IDS;
      scopeFilter = [
        { term: { [SERVICE_NAME]: sourceServiceName } },
        { terms: { [SPAN_ID]: parentIds } },
      ];
    } else {
      // Service→dependency: scope is source service + resource match.
      scopeFilter = [
        { term: { [SERVICE_NAME]: sourceServiceName } },
        { terms: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencies } },
      ];
    }

    // -----------------------------------------------------------------------
    // Phase 1b / "exit span aggregation":
    // Query the scoped exit spans and aggregate by transaction.name.
    // APM-native spans carry transaction.name; OTel spans don't (they land in
    // the OTEL_MISSING_KEY bucket for later resolution via trace.id).
    // -----------------------------------------------------------------------
    const exitSpanResponse = await apmEventClient.search(
      'get_connection_transactions_exit_span_agg',
      {
        apm: { events: [ProcessorEvent.span, ProcessorEvent.transaction] },
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              ...scopeFilter,
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
            ],
          },
        },
        aggs: {
          by_tx_name: {
            terms: {
              field: TRANSACTION_NAME,
              size: MAX_TRANSACTION_GROUPS,
              // OTel spans that lack transaction.name land here.
              missing: OTEL_MISSING_KEY as unknown as string,
            },
            aggs: {
              avg_call_latency: { avg: { field: SPAN_DURATION } },
              total_call_time: { sum: { field: SPAN_DURATION } },
              failed: { filter: { term: { [EVENT_OUTCOME]: EventOutcome.failure } } },
              transaction_type: { terms: { field: TRANSACTION_TYPE, size: 1 } },
              // Collect trace.ids for the OTel missing bucket.
              trace_ids: { terms: { field: TRACE_ID, size: MAX_IDS } },
            },
          },
          total_call_time: { sum: { field: SPAN_DURATION } },
        },
      }
    );

    const totalCallTime = exitSpanResponse.aggregations?.total_call_time?.value ?? 0;
    const allBuckets = exitSpanResponse.aggregations?.by_tx_name.buckets ?? [];

    if (allBuckets.length === 0) {
      return { transactionGroups: [], isMaxTransactionsReached };
    }

    // Separate APM (known transaction.name) from OTel (OTEL_MISSING_KEY bucket).
    const apmBuckets = allBuckets.filter((b) => String(b.key) !== OTEL_MISSING_KEY);
    const otelBucket = allBuckets.find((b) => String(b.key) === OTEL_MISSING_KEY);

    const durationMs = (end - start) / 1000 / 60; // time window in minutes

    // -----------------------------------------------------------------------
    // Build APM groups (accurate call latency from exit span.duration.us).
    // -----------------------------------------------------------------------
    const apmGroups = apmBuckets.map((bucket) => {
      const callCount = bucket.doc_count;
      const avgCallLatency = (bucket as any).avg_call_latency?.value ?? null;
      const totalTime = (bucket as any).total_call_time?.value ?? 0;
      const failedCount = (bucket as any).failed?.doc_count ?? 0;
      const transactionType = String(
        (bucket as any).transaction_type?.buckets?.[0]?.key ?? ''
      );

      return {
        name: String(bucket.key),
        transactionType,
        avgCallLatency,
        callCount,
        callRate: durationMs > 0 ? callCount / durationMs : null,
        failedCallRate: callCount > 0 ? failedCount / callCount : null,
        timeConsumedPct: totalCallTime > 0 ? totalTime / totalCallTime : null,
        isSampled: isMaxTransactionsReached,
      };
    });

    // -----------------------------------------------------------------------
    // Resolve OTel groups: trace.id → transaction.name via a Phase 2 query.
    // avgCallLatency for OTel groups is the overall average across the bucket
    // (same for every resolved transaction — an approximation for the PoC).
    // -----------------------------------------------------------------------
    let otelGroups: Array<(typeof apmGroups)[number]> = [];

    if (otelBucket && otelBucket.doc_count > 0) {
      const otelTraceIds = ((otelBucket as any).trace_ids?.buckets ?? []).map((b: any) =>
        String(b.key)
      );

      if (otelTraceIds.length > 0) {
        const otelAvgCallLatency = (otelBucket as any).avg_call_latency?.value ?? null;
        const otelFailedCount = (otelBucket as any).failed?.doc_count ?? 0;
        const otelCallCount = otelBucket.doc_count;
        const otelFailedCallRate = otelCallCount > 0 ? otelFailedCount / otelCallCount : null;

        const txResponse = await apmEventClient.search(
          'get_connection_transactions_otel_resolve',
          {
            apm: { events: [ProcessorEvent.transaction] },
            track_total_hits: false,
            size: 0,
            query: {
              bool: {
                filter: [
                  { term: { [SERVICE_NAME]: sourceServiceName } },
                  { terms: { [TRACE_ID]: otelTraceIds } },
                  ...rangeQuery(start, end),
                  ...environmentQuery(environment),
                ],
              },
            },
            aggs: {
              by_tx_name: {
                terms: { field: TRANSACTION_NAME, size: MAX_TRANSACTION_GROUPS },
                aggs: {
                  transaction_type: { terms: { field: TRANSACTION_TYPE, size: 1 } },
                },
              },
            },
          }
        );

        const txBuckets = txResponse.aggregations?.by_tx_name.buckets ?? [];

        otelGroups = txBuckets.map((bucket) => {
          const transactionType = String(
            (bucket as any).transaction_type?.buckets?.[0]?.key ?? ''
          );
          const groupCallCount = otelCallCount / (txBuckets.length || 1);

          return {
            name: String(bucket.key),
            transactionType,
            // OTel: use the overall bucket average — same for every resolved name.
            avgCallLatency: otelAvgCallLatency,
            callCount: Math.round(groupCallCount),
            callRate: durationMs > 0 ? groupCallCount / durationMs : null,
            failedCallRate: otelFailedCallRate,
            timeConsumedPct:
              totalCallTime > 0 ? (otelAvgCallLatency ?? 0) * groupCallCount / totalCallTime : null,
            isSampled: isMaxTransactionsReached || otelTraceIds.length >= MAX_IDS,
          };
        });
      }
    }

    const transactionGroups = [...apmGroups, ...otelGroups];

    return {
      transactionGroups,
      isMaxTransactionsReached,
    };
  });
}
