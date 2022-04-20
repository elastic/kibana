/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
import { ProcessorEvent } from '../../../common/processor_event';
import { SpanLinks } from '../../../typings/es_schemas/raw/fields/span_links';
import { SpanRaw } from '../../../typings/es_schemas/raw/span_raw';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { Setup } from '../../lib/helpers/setup_request';

export interface SpanLinkDetails {
  traceId: string;
  spanId: string;
  agentName?: AgentName;
  serviceName?: string;
  spanName?: string;
  duration?: number;
  spanSubtype?: string;
  spanType?: string;
}

// TODO: caue add kuery filter
export async function getSpanLinksDetails({
  setup,
  spanLinks,
}: {
  setup: Setup;
  spanLinks: SpanLinks;
}): Promise<SpanLinkDetails[]> {
  const { apmEventClient } = setup;

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
            {
              bool: {
                should: spanLinks.map((item) => ({
                  bool: {
                    filter: [
                      { term: { [TRACE_ID]: item.trace.id } },
                      {
                        bool: {
                          should: [
                            { term: { [SPAN_ID]: item.span.id } },
                            { term: { [TRANSACTION_ID]: item.span.id } },
                          ],
                        },
                      },
                    ],
                  },
                })),
              },
            },
          ],
        },
      },
    },
  });

  const spanLinksDetails = response.hits.hits.map(({ _source: source }) => {
    const commontProps = {
      traceId: source.trace.id,
      serviceName: source.service.name,
      agentName: source.agent.name,
    };
    if (source.processor.event === ProcessorEvent.transaction) {
      const transaction = source as TransactionRaw;
      return {
        ...commontProps,
        spanId: transaction.transaction.id,
        spanName: transaction.transaction.name,
        duration: transaction.transaction.duration.us,
      };
    }
    const span = source as SpanRaw;
    return {
      ...commontProps,
      spanId: span.span.id,
      spanName: span.span.name,
      duration: span.span.duration.us,
      spanSubtype: span.span.subtype,
      spanType: span.span.type,
    };
  });

  // TODO: caue: merge to add span links that don't have details

  return spanLinksDetails;
}
