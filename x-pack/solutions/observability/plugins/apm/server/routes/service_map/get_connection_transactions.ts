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
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { EventOutcome } from '../../../common/event_outcome';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { Environment } from '../../../common/environment_rt';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { withApmSpan } from '../../utils/with_apm_span';
import { CONNECTION_JOIN_TIME_BUFFER_MS, MAX_CONNECTION_IDS } from './connection_constants';
import { fieldsOf } from './get_connection_top_error';

/** Maximum number of transaction groups (distinct transaction names) returned. */
const MAX_TRANSACTION_GROUPS = 100;

interface ExitSpanCall {
  transactionId: string;
  durationUs: number;
  outcome: string | undefined;
}

/**
 * Transactions of the source service that call a connection, with the metrics of those calls.
 *
 * The calls are the exit spans of the source service that belong to the connection, matched on
 * the connection's resources (`dependencies`) like the failed calls are. Edges without resources
 * (service → service edges of the AI Agent map) fall back to the exit spans that are the parent
 * of an entry transaction of the target; that path spends the id budget on the target's whole
 * inbound traffic, so a busy target can leave this edge undersampled.
 *
 * A span document does not carry the name of its transaction, so the names are resolved through
 * the transaction documents of the source (`transaction.id`). Latency and failure rate are the
 * ones of the exit spans, not of the whole transaction. The newest {@link MAX_CONNECTION_IDS}
 * calls are used; `isSampled` tells when older ones are left out.
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
    let isSampled = false;

    if (dependencies.length > 0) {
      scopeFilter = [
        { term: { [SERVICE_NAME]: sourceServiceName } },
        { terms: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencies } },
      ];
    } else if (targetServiceName) {
      // The parent ids of the newest entry transactions of the target: the span ids of the exit
      // spans that called it. The parent id is specific to the call, so the environment of the
      // target is not filtered (the exit span query filters the source's environment).
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
              ],
            },
          },
        }
      );

      const parentIds = entryTransactionsResponse.hits.hits
        .map((hit) => fieldsOf(hit)[PARENT_ID]?.[0])
        .filter((parentId): parentId is string => typeof parentId === 'string');

      if (parentIds.length === 0) {
        return { transactionGroups: [], isSampled: false };
      }

      isSampled = entryTransactionsResponse.hits.total.value > MAX_CONNECTION_IDS;
      scopeFilter = [
        { term: { [SERVICE_NAME]: sourceServiceName } },
        { terms: { [SPAN_ID]: parentIds } },
      ];
    } else {
      // Unreachable: the route schema requires dependencies or targetServiceName.
      return { transactionGroups: [], isSampled: false };
    }

    const exitSpansResponse = await apmEventClient.search(
      'get_connection_transactions_exit_spans',
      {
        apm: { events: [ProcessorEvent.span] },
        track_total_hits: MAX_CONNECTION_IDS + 1,
        size: MAX_CONNECTION_IDS,
        sort: [{ [AT_TIMESTAMP]: 'desc' }],
        _source: false,
        fields: [TRANSACTION_ID, SPAN_DURATION, EVENT_OUTCOME],
        query: {
          bool: {
            filter: [...scopeFilter, ...rangeQuery(start, end), ...environmentQuery(environment)],
          },
        },
      }
    );

    const calls: ExitSpanCall[] = exitSpansResponse.hits.hits.flatMap((hit) => {
      const fields = fieldsOf(hit);
      const transactionId = fields[TRANSACTION_ID]?.[0];
      if (typeof transactionId !== 'string') {
        return [];
      }
      return {
        transactionId,
        durationUs: Number(fields[SPAN_DURATION]?.[0] ?? 0),
        outcome: fields[EVENT_OUTCOME]?.[0] as string | undefined,
      };
    });

    if (calls.length === 0) {
      return { transactionGroups: [], isSampled };
    }

    isSampled =
      isSampled || exitSpansResponse.hits.total.value > exitSpansResponse.hits.hits.length;

    // The name and type of the transaction of each call. A transaction starts before its exit
    // spans, so the range reaches back beyond the window to still resolve calls near its start.
    const transactionsResponse = await apmEventClient.search('get_connection_transactions_names', {
      apm: { events: [ProcessorEvent.transaction] },
      track_total_hits: false,
      size: MAX_CONNECTION_IDS,
      _source: false,
      fields: [TRANSACTION_ID, TRANSACTION_NAME, TRANSACTION_TYPE],
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: sourceServiceName } },
            { terms: { [TRANSACTION_ID]: [...new Set(calls.map((c) => c.transactionId))] } },
            ...rangeQuery(start - CONNECTION_JOIN_TIME_BUFFER_MS, end),
          ],
        },
      },
    });

    const transactionById = new Map<string, { name: string; type: string }>();
    for (const hit of transactionsResponse.hits.hits) {
      const fields = fieldsOf(hit);
      const id = fields[TRANSACTION_ID]?.[0];
      const name = fields[TRANSACTION_NAME]?.[0];
      if (typeof id === 'string' && typeof name === 'string') {
        transactionById.set(id, { name, type: String(fields[TRANSACTION_TYPE]?.[0] ?? '') });
      }
    }

    const groups = new Map<
      string,
      {
        transactionType: string;
        callCount: number;
        failedCount: number;
        knownOutcomeCount: number;
        totalDurationUs: number;
      }
    >();
    let totalCallTime = 0;
    for (const call of calls) {
      const transaction = transactionById.get(call.transactionId);
      if (!transaction) {
        continue;
      }
      const group = groups.get(transaction.name) ?? {
        transactionType: transaction.type,
        callCount: 0,
        failedCount: 0,
        knownOutcomeCount: 0,
        totalDurationUs: 0,
      };
      group.callCount += 1;
      group.failedCount += call.outcome === EventOutcome.failure ? 1 : 0;
      // Unknown outcomes are not successes: the rate only counts spans that reported one.
      group.knownOutcomeCount +=
        call.outcome === EventOutcome.failure || call.outcome === EventOutcome.success ? 1 : 0;
      group.totalDurationUs += call.durationUs;
      groups.set(transaction.name, group);
      totalCallTime += call.durationUs;
    }

    const rangeInMinutes = (end - start) / 1000 / 60;
    const transactionGroups = [...groups.entries()]
      .map(([name, group]) => ({
        name,
        transactionType: group.transactionType,
        avgCallLatency: group.callCount > 0 ? group.totalDurationUs / group.callCount : null,
        callCount: group.callCount,
        callRate: rangeInMinutes > 0 ? group.callCount / rangeInMinutes : null,
        failedCallRate:
          group.knownOutcomeCount > 0 ? group.failedCount / group.knownOutcomeCount : null,
        timeConsumedPct: totalCallTime > 0 ? group.totalDurationUs / totalCallTime : null,
      }))
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, MAX_TRANSACTION_GROUPS);

    return { transactionGroups, isSampled };
  });
}
