/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery, termQuery, termsQuery } from '@kbn/observability-plugin/server';
import { keyBy } from 'lodash';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  AGENT_NAME,
  AT_TIMESTAMP,
  EVENT_OUTCOME,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  TRACE_ID,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import type { Environment } from '../../../common/environment_rt';
import { EventOutcome } from '../../../common/event_outcome';
import { environmentQuery } from '../../../common/utils/environment_query';
import { maybe } from '../../../common/utils/maybe';
import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

const MAX_NUM_SPANS = 1000;

export interface DependencySpan {
  '@timestamp': number;
  spanId: string;
  spanName: string;
  serviceName: string;
  agentName: AgentName;
  traceId: string;
  transactionId?: string;
  transactionType?: string;
  transactionName?: string;
  duration: number;
  outcome: EventOutcome;
}

export async function getTopDependencySpans({
  apmEventClient,
  dependencyName,
  spanName,
  start,
  end,
  environment,
  kuery,
  sampleRangeFrom,
  sampleRangeTo,
}: {
  apmEventClient: APMEventClient;
  dependencyName: string;
  spanName: string;
  start: number;
  end: number;
  environment: Environment;
  kuery: string;
  sampleRangeFrom?: number;
  sampleRangeTo?: number;
}): Promise<DependencySpan[]> {
  const topDedsRequiredFields = asMutableArray([
    SPAN_ID,
    TRACE_ID,
    SPAN_NAME,
    SERVICE_NAME,
    AGENT_NAME,
    SPAN_DURATION,
    EVENT_OUTCOME,
    AT_TIMESTAMP,
  ] as const);

  const spans = (
    await apmEventClient.search('get_top_dependency_spans', {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      track_total_hits: false,
      size: MAX_NUM_SPANS,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...termQuery(SPAN_DESTINATION_SERVICE_RESOURCE, dependencyName),
            ...termQuery(SPAN_NAME, spanName),
            ...((sampleRangeFrom ?? 0) >= 0 && (sampleRangeTo ?? 0) > 0
              ? [
                  {
                    range: {
                      [SPAN_DURATION]: {
                        gte: sampleRangeFrom,
                        lte: sampleRangeTo,
                      },
                    },
                  },
                ]
              : []),
          ],
        },
      },
      fields: topDedsRequiredFields,
    })
  ).hits.hits.map((hit) =>
    accessKnownApmEventFields(hit.fields).requireFields(topDedsRequiredFields)
  );

  const traceIds = spans.map((span) => span[TRACE_ID]);

  const txRequiredFields = asMutableArray([
    TRACE_ID,
    TRANSACTION_ID,
    TRANSACTION_TYPE,
    TRANSACTION_NAME,
  ] as const);

  const transactions = (
    await apmEventClient.search('get_transactions_for_dependency_spans', {
      apm: {
        events: [ProcessorEvent.transaction],
      },
      track_total_hits: false,
      size: traceIds.length,
      query: {
        bool: {
          filter: [...termsQuery(TRACE_ID, ...traceIds), { exists: { field: TRANSACTION_ID } }],
        },
      },
      fields: txRequiredFields,
      sort: {
        '@timestamp': 'desc',
      },
    })
  ).hits.hits.map((hit) => accessKnownApmEventFields(hit.fields).requireFields(txRequiredFields));

  const transactionsByTraceId = keyBy(transactions, (transaction) => transaction[TRACE_ID]);

  return spans.map((span): DependencySpan => {
    const traceId = span[TRACE_ID];
    const transaction = maybe(transactionsByTraceId[traceId]);

    return {
      [AT_TIMESTAMP]: new Date(span[AT_TIMESTAMP]).getTime(),
      spanId: span[SPAN_ID],
      spanName: span[SPAN_NAME],
      serviceName: span[SERVICE_NAME],
      agentName: span[AGENT_NAME],
      duration: span[SPAN_DURATION],
      traceId,
      outcome: (span[EVENT_OUTCOME] || EventOutcome.unknown) as EventOutcome,
      transactionId: transaction?.[TRANSACTION_ID],
      transactionType: transaction?.[TRANSACTION_TYPE],
      transactionName: transaction?.[TRANSACTION_NAME],
    };
  });
}
