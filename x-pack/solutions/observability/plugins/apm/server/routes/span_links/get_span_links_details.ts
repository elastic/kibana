/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { chunk } from 'lodash';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import type { SpanLinkDetails } from '@kbn/apm-types';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
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
  DURATION,
  KIND,
  SERVICE_LANGUAGE_NAME,
} from '../../../common/es_fields/apm';
import type { Environment } from '../../../common/environment_rt';
import type { SpanLink } from '../../../typings/es_schemas/raw/fields/span_links';
import { getBufferedTimerange } from './utils';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { parseOtelDuration } from '../../lib/helpers/parse_otel_duration';
import { compactMap } from '../../utils/compact_map';

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
}): Promise<SpanLinkDetails[]> {
  const { startWithBuffer, endWithBuffer } = getBufferedTimerange({
    start,
    end,
  });

  const requiredFields = asMutableArray([TRACE_ID, SERVICE_NAME] as const);

  const requiredTxFields = asMutableArray([
    TRANSACTION_ID,
    TRANSACTION_NAME,
    TRANSACTION_DURATION,
    AGENT_NAME,
  ] as const);

  const requiredSpanFields = asMutableArray([
    SPAN_ID,
    SPAN_NAME,
    SPAN_DURATION,
    SPAN_SUBTYPE,
    SPAN_TYPE,
    AGENT_NAME,
  ] as const);

  const requiredUnprocessedOtelSpanFields = asMutableArray([
    SPAN_ID,
    SPAN_NAME,
    DURATION,
    KIND,
    SERVICE_LANGUAGE_NAME,
  ] as const);

  const optionalFields = asMutableArray([SERVICE_ENVIRONMENT, PROCESSOR_EVENT] as const);

  const response = await apmEventClient.search(
    'get_span_links_details',
    {
      apm: {
        events: [ProcessorEvent.span, ProcessorEvent.transaction],
      },
      fields: [
        ...requiredFields,
        ...requiredTxFields,
        ...requiredSpanFields,
        ...requiredUnprocessedOtelSpanFields,
        ...optionalFields,
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
    { skipProcessorEventFilter: true }
  );

  const spanIdsMap = spanLinks.reduce<Record<string, SpanLink>>((acc, link) => {
    acc[link.span.id] = link;
    return acc;
  }, {});

  return compactMap(response.hits.hits, (hit) => {
    const commonEvent = accessKnownApmEventFields(hit.fields).requireFields(requiredFields);

    const commonDetails = {
      serviceName: commonEvent[SERVICE_NAME],
      environment: commonEvent[SERVICE_ENVIRONMENT] as Environment,
    };

    switch (commonEvent[PROCESSOR_EVENT]) {
      case ProcessorEvent.transaction: {
        const event = commonEvent.requireFields(requiredTxFields);

        return {
          traceId: event[TRACE_ID],
          spanId: event[TRANSACTION_ID],
          details: {
            ...commonDetails,
            transactionId: event[TRANSACTION_ID],
            agentName: event[AGENT_NAME],
            spanName: event[TRANSACTION_NAME],
            duration: event[TRANSACTION_DURATION],
          },
        };
      }

      case ProcessorEvent.span: {
        const event = commonEvent.requireFields(requiredSpanFields);

        // The above query might return other spans from the same transaction because siblings spans share the same transaction.id
        // so, if it is a span we need to guarantee that the span.id is the same as the span links ids
        if (!spanIdsMap[event[SPAN_ID]]) {
          return null;
        }

        return {
          traceId: event[TRACE_ID],
          spanId: event[SPAN_ID],
          details: {
            ...commonDetails,
            transactionId: event[TRANSACTION_ID],
            agentName: event[AGENT_NAME],
            spanName: event[SPAN_NAME],
            duration: event[SPAN_DURATION],
            spanSubtype: event[SPAN_SUBTYPE],
            spanType: event[SPAN_TYPE],
          },
        };
      }

      default: {
        const event = commonEvent.requireFields(requiredUnprocessedOtelSpanFields);

        return {
          traceId: event[TRACE_ID],
          spanId: event[SPAN_ID],
          details: {
            ...commonDetails,
            agentName: event[SERVICE_LANGUAGE_NAME] as AgentName,
            spanName: event[SPAN_NAME],
            duration: parseOtelDuration(event.duration),
          },
        };
      }
    }
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
    (acc, spanLink) => {
      const key = `${spanLink.traceId}:${spanLink.spanId}`;

      acc[key] = spanLink;

      return acc;
    },
    {}
  );

  // It's important to keep the original order of the span links,
  // so loops trough the original list merging external links and links with details.
  // external links are links that the details were not found in the ES query.
  return compactMap(spanLinks, (item) => {
    const key = `${item.trace.id}:${item.span.id}`;
    const details = spanLinksDetailsMap[key];

    if (details) {
      return details;
    }

    // When kuery is not set, we return external links, else we hide this item.
    return !kuery.length ? { traceId: item.trace.id, spanId: item.span.id } : undefined;
  });
}
