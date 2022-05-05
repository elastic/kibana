/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { chunk, isEmpty } from 'lodash';
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
} from '../../../common/elasticsearch_fieldnames';
import { Environment } from '../../../common/environment_rt';
import { ProcessorEvent } from '../../../common/processor_event';
import { SpanLinkDetails } from '../../../common/span_links';
import { SpanLink } from '../../../typings/es_schemas/raw/fields/span_links';
import { SpanRaw } from '../../../typings/es_schemas/raw/span_raw';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { Setup } from '../../lib/helpers/setup_request';
import { getBufferedTimerange } from './utils';

async function fetchSpanLinksDetails({
  setup,
  kuery,
  spanLinks,
  start,
  end,
  processorEvent,
}: {
  setup: Setup;
  kuery: string;
  spanLinks: SpanLink[];
  start: number;
  end: number;
  processorEvent: ProcessorEvent;
}) {
  const { apmEventClient } = setup;

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
    ],
    body: {
      size: 1000,
      query: {
        bool: {
          filter: [
            ...rangeQuery(startWithBuffer, endWithBuffer),
            ...kqlQuery(kuery),
            {
              bool: {
                should: spanLinks.map((item) => ({
                  bool: {
                    filter: [
                      { term: { [TRACE_ID]: item.trace.id } },
                      { term: { [PROCESSOR_EVENT]: processorEvent } },
                      ...(processorEvent === ProcessorEvent.transaction
                        ? [{ term: { [TRANSACTION_ID]: item.span.id } }]
                        : [{ term: { [SPAN_ID]: item.span.id } }]),
                    ],
                  },
                })),
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    },
  });
  return response.hits.hits;
}

export async function getSpanLinksDetails({
  setup,
  spanLinks,
  kuery,
  start,
  end,
  processorEvent,
}: {
  setup: Setup;
  spanLinks: SpanLink[];
  kuery: string;
  start: number;
  end: number;
  processorEvent: ProcessorEvent;
}): Promise<SpanLinkDetails[]> {
  if (!spanLinks.length) {
    return [];
  }

  // chunk span links to avoid too_many_nested_clauses problem
  const spanLinksChunks = chunk(spanLinks, 500);
  const chunckedResponses = await Promise.all(
    spanLinksChunks.map((spanLinksChunk) =>
      fetchSpanLinksDetails({
        setup,
        kuery,
        spanLinks: spanLinksChunk,
        start,
        end,
        processorEvent,
      })
    )
  );

  const linkedSpans = chunckedResponses.flat();

  // Creates a map for all span links details found
  const spanLinksDetailsMap = linkedSpans.reduce<
    Record<string, SpanLinkDetails>
  >((acc, { _source: source }) => {
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
  }, {});

  // When kuery is set, returns only the items found in the uery
  if (!isEmpty(kuery)) {
    return Object.values(spanLinksDetailsMap);
  }

  // It's important to keep the original order of the span links,
  // so loops trough the original list merging external links and links with details.
  // external links are links that the details were not found in the ES query.
  return spanLinks.map((item) => {
    const key = `${item.trace.id}:${item.span.id}`;
    const details = spanLinksDetailsMap[key];
    return details ? details : { traceId: item.trace.id, spanId: item.span.id };
  });
}
