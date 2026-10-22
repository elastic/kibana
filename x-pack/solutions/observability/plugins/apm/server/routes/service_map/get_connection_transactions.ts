/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import type { ConnectionTransactionsResponse } from '@kbn/apm-api-shared';
import {
  AT_TIMESTAMP,
  EVENT_OUTCOME,
  PARENT_ID,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { EventOutcome } from '../../../common/event_outcome';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { Environment } from '../../../common/environment_rt';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { withApmSpan } from '../../utils/with_apm_span';
import { MAX_CONNECTION_IDS } from './connection_constants';

/** Maximum number of transaction groups (distinct transaction names) returned. */
const MAX_TRANSACTION_GROUPS = 100;

/**
 * Transactions of the source service that call a connection, with the metrics of those calls.
 *
 * The calls are the exit spans of the source service that belong to the connection:
 * - service → dependency: exit spans to the connection's resources (`dependencies`);
 * - service → service (`targetServiceName`): exit spans that are the parent of an entry
 *   transaction of the target. Matching on the parent id (not on the resource, nor on the trace)
 *   keeps calls to the target through another service out of the result.
 *
 * Latency and failure rate are the ones of the exit spans, not of the whole transaction. Exit
 * spans without `transaction.name` (OTel data that is not enriched) cannot be attributed to a
 * transaction and are left out.
 */
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
  targetServiceName?: string;
  dependencies: string[];
  environment: Environment;
  start: number;
  end: number;
}): Promise<ConnectionTransactionsResponse> {
  return withApmSpan('get_connection_transactions', async () => {
    let scopeFilter: QueryDslQueryContainer[];
    let isMaxTransactionsReached = false;

    if (targetServiceName) {
      // The parent ids of the newest entry transactions of the target: the span ids of the
      // exit spans that called it. When the target has more calls than the cap, the oldest ones
      // are left out.
      const entryTransactionsResponse = await apmEventClient.search(
        'get_connection_transactions_target_parent_ids',
        {
          apm: { events: [ProcessorEvent.transaction] },
          track_total_hits: MAX_CONNECTION_IDS + 1,
          size: MAX_CONNECTION_IDS,
          sort: [{ [AT_TIMESTAMP]: 'desc' }],
          _source: false,
          fields: [PARENT_ID],
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
        }
      );

      const parentIds = entryTransactionsResponse.hits.hits
        .map((hit) => (hit.fields as Record<string, unknown[]> | undefined)?.[PARENT_ID]?.[0])
        .filter((parentId): parentId is string => typeof parentId === 'string');

      if (parentIds.length === 0) {
        return { transactionGroups: [], isMaxTransactionsReached: false };
      }

      isMaxTransactionsReached = entryTransactionsResponse.hits.total.value > MAX_CONNECTION_IDS;
      scopeFilter = [
        { term: { [SERVICE_NAME]: sourceServiceName } },
        { terms: { [SPAN_ID]: parentIds } },
      ];
    } else {
      scopeFilter = [
        { term: { [SERVICE_NAME]: sourceServiceName } },
        { terms: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencies } },
      ];
    }

    const exitSpansResponse = await apmEventClient.search(
      'get_connection_transactions_exit_spans',
      {
        apm: { events: [ProcessorEvent.span] },
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              ...scopeFilter,
              { exists: { field: TRANSACTION_NAME } },
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
            ],
          },
        },
        aggs: {
          total_call_time: { sum: { field: SPAN_DURATION } },
          by_transaction_name: {
            terms: { field: TRANSACTION_NAME, size: MAX_TRANSACTION_GROUPS },
            aggs: {
              avg_call_latency: { avg: { field: SPAN_DURATION } },
              call_time: { sum: { field: SPAN_DURATION } },
              failed: { filter: { term: { [EVENT_OUTCOME]: EventOutcome.failure } } },
              transaction_type: { terms: { field: TRANSACTION_TYPE, size: 1 } },
            },
          },
        },
      }
    );

    const totalCallTime = exitSpansResponse.aggregations?.total_call_time.value ?? 0;
    const rangeInMinutes = (end - start) / 1000 / 60;

    const transactionGroups = (
      exitSpansResponse.aggregations?.by_transaction_name.buckets ?? []
    ).map((bucket) => {
      const callCount = bucket.doc_count;
      return {
        name: String(bucket.key),
        transactionType: String(bucket.transaction_type.buckets[0]?.key ?? ''),
        avgCallLatency: bucket.avg_call_latency.value,
        callCount,
        callRate: rangeInMinutes > 0 ? callCount / rangeInMinutes : null,
        failedCallRate: callCount > 0 ? bucket.failed.doc_count / callCount : null,
        timeConsumedPct: totalCallTime > 0 ? (bucket.call_time.value ?? 0) / totalCallTime : null,
        isSampled: isMaxTransactionsReached,
      };
    });

    return { transactionGroups, isMaxTransactionsReached };
  });
}
