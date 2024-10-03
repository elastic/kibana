/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { chunk, compact, isEmpty, keyBy } from 'lodash';
import { type SpanLinksDetails, spanLinksDetailsMapping } from '../../utils/es_fields_mappings';
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
import { getBufferedTimerange } from './utils';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

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

  const spanLinksDetails = response.hits.hits
    .map((hit) => spanLinksDetailsMapping(hit.fields))
    .filter((hits): hits is NonNullable<SpanLinksDetails> => !!hits);

  const spanIdsMap = keyBy(spanLinks, 'span.id');

  return spanLinksDetails.filter((spanLink) => {
    // The above query might return other spans from the same transaction because siblings spans share the same transaction.id
    // so, if it is a span we need to guarantee that the span.id is the same as the span links ids
    if (spanLink?.processor.event === ProcessorEvent.span) {
      const hasSpanId = spanIdsMap[spanLink.span.id] || false;
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
    (acc, spanLink) => {
      const commonDetails = {
        serviceName: spanLink.service.name,
        agentName: spanLink.agent.name,
        environment: spanLink.service.environment as Environment,
        transactionId: spanLink.transaction?.id,
      };

      if (spanLink.processor.event === ProcessorEvent.transaction) {
        const key = `${spanLink.trace.id}:${spanLink.transaction.id}`;
        acc[key] = {
          traceId: spanLink.trace.id,
          spanId: spanLink.transaction.id,
          details: {
            ...commonDetails,
            spanName: spanLink.transaction.name,
            duration: spanLink.transaction.duration.us,
          },
        };
      } else {
        const key = `${spanLink.trace.id}:${spanLink.span.id}`;
        acc[key] = {
          traceId: spanLink.trace.id,
          spanId: spanLink.span.id,
          details: {
            ...commonDetails,
            spanName: spanLink.span.name,
            duration: spanLink.span.duration.us,
            spanSubtype: spanLink.span.subtype,
            spanType: spanLink.span.type,
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
