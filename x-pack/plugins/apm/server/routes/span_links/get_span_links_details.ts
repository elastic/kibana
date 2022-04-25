/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery } from '@kbn/observability-plugin/server';
import { isEmpty } from 'lodash';
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
  environment?: Environment;
  transactionId?: string;
}

export async function getSpanLinksDetails({
  setup,
  spanLinks,
  kuery,
}: {
  setup: Setup;
  spanLinks: SpanLinks;
  kuery: string;
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
            ...kqlQuery(kuery),
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

  // Creates a map for all span links details found
  const spanLinksDetailsMap = response.hits.hits.reduce<
    Record<string, SpanLinkDetails>
  >((acc, { _source: source }) => {
    const commontProps = {
      traceId: source.trace.id,
      serviceName: source.service.name,
      agentName: source.agent.name,
      environment: source.service.environment as Environment,
      transactionId: source.transaction?.id,
    };

    if (source.processor.event === ProcessorEvent.transaction) {
      const transaction = source as TransactionRaw;
      const key = `${transaction.trace.id}:${transaction.transaction.id}`;
      return {
        ...acc,
        [key]: {
          ...commontProps,
          spanId: transaction.transaction.id,
          spanName: transaction.transaction.name,
          duration: transaction.transaction.duration.us,
        },
      };
    }

    const span = source as SpanRaw;
    const key = `${span.trace.id}:${span.span.id}`;
    return {
      ...acc,
      [key]: {
        ...commontProps,
        spanId: span.span.id,
        spanName: span.span.name,
        duration: span.span.duration.us,
        spanSubtype: span.span.subtype,
        spanType: span.span.type,
      },
    };
  }, {});

  // When kuery is set, returns only the items found in the query
  if (!isEmpty(kuery)) {
    return Object.values(spanLinksDetailsMap);
  }

  // It's important to keep the original order of the span links,
  // so loops trough the original list merging external links and links with details.
  // external links are links that the details were not found in the query above.
  return spanLinks.map((item) => {
    const key = `${item.trace.id}:${item.span.id}`;
    const details = spanLinksDetailsMap[key];
    return details ? details : { traceId: item.trace.id, spanId: item.span.id };
  });
}
