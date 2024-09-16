/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { chunk, compact, isEmpty, keyBy } from 'lodash';
import {
  SERVICE_NAME,
  SPAN_ID,
  SPAN_NAME,
  TRACE_ID,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_DURATION,
  SPAN_DURATION,
  PROCESSOR_EVENT,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../common/es_fields/apm';
import { Environment } from '../../../common/environment_rt';
import { SpanLinkDetails } from '../../../common/span_links';
import { SpanLink } from '../../../typings/es_schemas/raw/fields/span_links';
import { SpanRaw } from '../../../typings/es_schemas/raw/span_raw';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { getBufferedTimerange } from './utils';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { normalizeFields } from '../../utils/normalize_fields';

async function fetchSpanLinksDetails({
  apmEventClient,
  kuery,
  spanLinks,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  kuery: string;
  spanLinks: SpanLink[];
  start: number;
  end: number;
}) {
  const { startWithBuffer, endWithBuffer } = getBufferedTimerange({
    start,
    end,
  });

  const response = await apmEventClient.search('get_span_links_details', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    _source: [
      TRACE_ID,
      SPAN_ID,
      TRANSACTION_ID,
      SERVICE_NAME,
      SPAN_NAME,
      TRANSACTION_NAME,
      TRANSACTION_DURATION,
      SPAN_DURATION,
      PROCESSOR_EVENT,
      SPAN_SUBTYPE,
      SPAN_TYPE,
      AGENT_NAME,
      SERVICE_ENVIRONMENT,
    ],
    body: {
      fields: [
        TRACE_ID,
        SPAN_ID,
        TRANSACTION_ID,
        SERVICE_NAME,
        SPAN_NAME,
        TRANSACTION_NAME,
        TRANSACTION_DURATION,
        SPAN_DURATION,
        PROCESSOR_EVENT,
        SPAN_SUBTYPE,
        SPAN_TYPE,
        AGENT_NAME,
        SERVICE_ENVIRONMENT,
      ],
      track_total_hits: false,
      size: 1000,
      query: {
        bool: {
          filter: [
            ...rangeQuery(startWithBuffer, endWithBuffer),
            ...kqlQuery(kuery),
            {
              bool: {
                should: spanLinks.map((item) => {
                  return {
                    bool: {
                      filter: [
                        { term: { [TRACE_ID]: item.trace.id } },
                        {
                          bool: {
                            should: [
                              { term: { [SPAN_ID]: item.span.id } },
                              { term: { [TRANSACTION_ID]: item.span.id } },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                    },
                  };
                }),
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    },
  });

  const spanIdsMap = keyBy(spanLinks, 'span.id');

  return response.hits.hits.filter(({ fields }) => {
    // The above query might return other spans from the same transaction because siblings spans share the same transaction.id
    // so, if it is a span we need to guarantee that the span.id is the same as the span links ids
    if (fields['processor.event']?.[0] === ProcessorEvent.span) {
      const span = normalizeFields(fields) as unknown as SpanRaw;
      const hasSpanId = spanIdsMap[span.span.id] || false;
      return hasSpanId;
    }
    return true;
  });
}

export async function getSpanLinksDetails({
  apmEventClient,
  spanLinks,
  kuery,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  spanLinks: SpanLink[];
  kuery: string;
  start: number;
  end: number;
}): Promise<SpanLinkDetails[]> {
  if (!spanLinks.length) {
    return [];
  }

  // chunk span links to avoid too_many_nested_clauses problem
  const spanLinksChunks = chunk(spanLinks, 500);
  const chunkedResponses = await Promise.all(
    spanLinksChunks.map((spanLinksChunk) =>
      fetchSpanLinksDetails({
        apmEventClient,
        kuery,
        spanLinks: spanLinksChunk,
        start,
        end,
      })
    )
  );

  const linkedSpans = chunkedResponses.flat();

  // Creates a map for all span links details found
  const spanLinksDetailsMap = linkedSpans.reduce<Record<string, SpanLinkDetails>>(
    (acc, { _source: source }) => {
      const commonDetails = {
        serviceName: source.service.name,
        agentName: source.agent.name,
        environment: source.service.environment as Environment,
        transactionId: source.transaction?.id,
      };

      if (source.processor.event === ProcessorEvent.transaction) {
        const transaction = source as TransactionRaw;
        const key = `${transaction.trace.id}:${transaction.transaction.id}`;
        acc[key] = {
          traceId: source.trace.id,
          spanId: transaction.transaction.id,
          details: {
            ...commonDetails,
            spanName: transaction.transaction.name,
            duration: transaction.transaction.duration.us,
          },
        };
      } else {
        const span = source as SpanRaw;
        const key = `${span.trace.id}:${span.span.id}`;
        acc[key] = {
          traceId: source.trace.id,
          spanId: span.span.id,
          details: {
            ...commonDetails,
            spanName: span.span.name,
            duration: span.span.duration.us,
            spanSubtype: span.span.subtype,
            spanType: span.span.type,
          },
        };
      }

      return acc;
    },
    {}
  );

  // It's important to keep the original order of the span links,
  // so loops trough the original list merging external links and links with details.
  // external links are links that the details were not found in the ES query.
  return compact(
    spanLinks.map((item) => {
      const key = `${item.trace.id}:${item.span.id}`;
      const details = spanLinksDetailsMap[key];
      if (details) {
        return details;
      }

      // When kuery is not set, returns external links, if not hides this item.
      return isEmpty(kuery) ? { traceId: item.trace.id, spanId: item.span.id } : undefined;
    })
  );
}
