/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsQuery, rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { EventOutcome } from '../../../common/event_outcome';
import type { ServiceMapService, ServiceMapSpan } from '../../../common/service_map/types';
import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  AGENT_NAME,
  PARENT_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
  EVENT_OUTCOME,
  AT_TIMESTAMP,
  OTEL_SPAN_LINKS_SPAN_ID,
  SPAN_NAME,
  SPAN_LINKS_SPAN_ID,
  TRANSACTION_NAME,
  SPAN_LINKS_TRACE_ID,
  OTEL_SPAN_LINKS_TRACE_ID,
} from '../../../common/es_fields/apm';

// https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#span-limits
const SPAN_LINK_IDS_LIMIT = 128;
const MAX_EXIT_SPANS = 10000;
const MAX_SPAN_LINKS = 1000;

type IncomingSpanLink = ServiceMapService & { transactionName: string };

export async function fetchExitSpanSamplesFromTraceIds({
  apmEventClient,
  traceIds,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  start: number;
  end: number;
}) {
  const [exitSpansSample, { outgoingSpanLinksSample, incomingSpanLinksSample }] = await Promise.all(
    [
      fetchExitSpanIdsFromTraceIds({
        apmEventClient,
        traceIds,
        start,
        end,
      }),
      fetchSpanLinksFromTraceIds({
        apmEventClient,
        traceIds,
        start,
        end,
      }),
    ]
  );

  const [transactionsFromExitSpans, spansFromSpanLinks] = await Promise.all([
    fetchTransactionsFromExitSpans({
      apmEventClient,
      exitSpansSample,
      start,
      end,
    }),
    fetchSpansFromSpanLinks({
      apmEventClient,
      outgoingSpanLinksSample,
      incomingSpanLinksSample,
      start,
      end,
    }),
  ]);

  return transactionsFromExitSpans.concat(spansFromSpanLinks);
}

async function fetchExitSpanIdsFromTraceIds({
  apmEventClient,
  traceIds,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  start: number;
  end: number;
}) {
  const sampleExitSpans = await apmEventClient.search('get_service_map_exit_span_samples', {
    apm: {
      events: [ProcessorEvent.span],
    },

    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...termsQuery(TRACE_ID, ...traceIds),
          ...existsQuery(SPAN_DESTINATION_SERVICE_RESOURCE),
        ],
      },
    },
    aggs: {
      exitSpans: {
        composite: {
          sources: asMutableArray([
            { serviceName: { terms: { field: SERVICE_NAME } } },
            {
              spanDestinationServiceResource: {
                terms: { field: SPAN_DESTINATION_SERVICE_RESOURCE },
              },
            },
          ] as const),
          size: MAX_EXIT_SPANS,
        },
        aggs: {
          eventOutcomeGroup: {
            filters: {
              filters: {
                success: {
                  term: {
                    [EVENT_OUTCOME]: EventOutcome.success as const,
                  },
                },
                others: {
                  bool: {
                    must_not: {
                      term: {
                        [EVENT_OUTCOME]: EventOutcome.success as const,
                      },
                    },
                  },
                },
              },
            },
            aggs: {
              sample: {
                top_metrics: {
                  size: 1,
                  sort: {
                    [AT_TIMESTAMP]: 'asc' as const,
                  },
                  metrics: asMutableArray([
                    { field: SPAN_ID },
                    { field: SPAN_TYPE },
                    { field: SPAN_SUBTYPE },
                    { field: SPAN_DESTINATION_SERVICE_RESOURCE },
                    { field: SERVICE_NAME },
                    { field: SERVICE_ENVIRONMENT },
                    { field: AGENT_NAME },
                  ] as const),
                },
              },
            },
          },
        },
      },
    },
  });

  const destinationsBySpanId = new Map<string, ServiceMapSpan>();

  sampleExitSpans.aggregations?.exitSpans.buckets.forEach((bucket) => {
    const { success, others } = bucket.eventOutcomeGroup.buckets;
    const eventOutcomeGroup =
      success.sample.top.length > 0 ? success : others.sample.top.length > 0 ? others : undefined;

    const sample = eventOutcomeGroup?.sample.top[0]?.metrics;
    if (!sample) {
      return;
    }

    const spanId = sample[SPAN_ID] as string;

    destinationsBySpanId.set(spanId, {
      spanId,
      spanDestinationServiceResource: bucket.key.spanDestinationServiceResource as string,
      spanType: sample[SPAN_TYPE] as string,
      spanSubtype: sample[SPAN_SUBTYPE] as string,
      agentName: sample[AGENT_NAME] as AgentName,
      serviceName: bucket.key.serviceName as string,
      serviceEnvironment: sample[SERVICE_ENVIRONMENT] as string,
    });
  });

  return destinationsBySpanId;
}

async function fetchSpanLinksFromTraceIds({
  apmEventClient,
  traceIds,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  start: number;
  end: number;
}) {
  const sampleExitSpans = await apmEventClient.search('get_service_map_span_link_samples', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          {
            bool: {
              minimum_should_match: 1,
              should: [
                ...existsQuery(SPAN_LINKS_TRACE_ID),
                ...existsQuery(OTEL_SPAN_LINKS_TRACE_ID),
              ],
            },
          },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                ...termsQuery(SPAN_LINKS_TRACE_ID, ...traceIds),
                ...termsQuery(OTEL_SPAN_LINKS_TRACE_ID, ...traceIds),
                // needed for focused service map
                // containing incoming links in the root transaction
                ...termsQuery(TRACE_ID, ...traceIds),
              ],
            },
          },
        ],
      },
    },
    aggs: {
      outgoingSpanLinks: {
        composite: {
          sources: asMutableArray([
            { serviceName: { terms: { field: SERVICE_NAME } } },
            {
              spanName: {
                terms: { field: SPAN_NAME },
              },
            },
          ] as const),
          size: MAX_SPAN_LINKS,
        },
        aggs: {
          linkedSpanId: {
            terms: {
              field: SPAN_LINKS_SPAN_ID,
              size: SPAN_LINK_IDS_LIMIT,
            },
          },
          otelLinkedSpanId: {
            terms: {
              field: OTEL_SPAN_LINKS_SPAN_ID,
              size: SPAN_LINK_IDS_LIMIT,
            },
          },
          sample: {
            top_metrics: {
              size: 1,
              sort: {
                [AT_TIMESTAMP]: 'asc' as const,
              },
              metrics: asMutableArray([
                { field: SPAN_TYPE },
                { field: SPAN_SUBTYPE },
                { field: SPAN_DESTINATION_SERVICE_RESOURCE },
                { field: SERVICE_NAME },
                { field: SERVICE_ENVIRONMENT },
                { field: AGENT_NAME },
              ] as const),
            },
          },
        },
      },
      incomingSpanLinks: {
        composite: {
          sources: asMutableArray([
            { serviceName: { terms: { field: SERVICE_NAME } } },
            {
              transactionName: {
                terms: { field: TRANSACTION_NAME },
              },
            },
          ] as const),
          size: MAX_SPAN_LINKS,
        },
        aggs: {
          linkedSpanId: {
            terms: {
              field: SPAN_LINKS_SPAN_ID,
              size: SPAN_LINK_IDS_LIMIT,
            },
          },
          otelLinkedSpanId: {
            terms: {
              field: OTEL_SPAN_LINKS_SPAN_ID,
              size: SPAN_LINK_IDS_LIMIT,
            },
          },
          sample: {
            top_metrics: {
              size: 1,
              sort: {
                [AT_TIMESTAMP]: 'asc' as const,
              },
              metrics: asMutableArray([
                { field: SERVICE_NAME },
                { field: SERVICE_ENVIRONMENT },
                { field: AGENT_NAME },
              ] as const),
            },
          },
        },
      },
    },
  });

  const outgoingSpanLinksSample = new Map<string, ServiceMapSpan>();
  sampleExitSpans.aggregations?.outgoingSpanLinks.buckets.forEach((bucket) => {
    const sample = bucket.sample.top[0]?.metrics;
    if (!sample) {
      return;
    }

    const spanIds = new Set(
      [...bucket.otelLinkedSpanId.buckets, ...bucket.linkedSpanId.buckets].map(
        (item) => item.key as string
      )
    );

    for (const spanId of spanIds) {
      outgoingSpanLinksSample.set(spanId, {
        spanId,
        spanDestinationServiceResource: (sample[SPAN_DESTINATION_SERVICE_RESOURCE] ??
          bucket.key.spanName) as string,
        spanType: sample[SPAN_TYPE] as string,
        spanSubtype: sample[SPAN_SUBTYPE] as string,
        agentName: sample[AGENT_NAME] as AgentName,
        serviceName: bucket.key.serviceName as string,
        serviceEnvironment: sample[SERVICE_ENVIRONMENT] as string,
      });
    }
  });

  const incomingSpanLinksSample = new Map<string, IncomingSpanLink>();
  sampleExitSpans.aggregations?.incomingSpanLinks.buckets.forEach((bucket) => {
    const sample = bucket.sample.top[0]?.metrics;
    if (!sample) {
      return;
    }

    const spanIds = new Set(
      [...bucket.otelLinkedSpanId.buckets, ...bucket.linkedSpanId.buckets].map(
        (item) => item.key as string
      )
    );

    for (const spanId of spanIds) {
      incomingSpanLinksSample.set(spanId, {
        agentName: sample[AGENT_NAME] as AgentName,
        serviceName: bucket.key.serviceName as string,
        serviceEnvironment: sample[SERVICE_ENVIRONMENT] as string,
        transactionName: bucket.key.transactionName as string,
      });
    }
  });

  return { outgoingSpanLinksSample, incomingSpanLinksSample };
}

async function fetchTransactionsFromExitSpans({
  apmEventClient,
  exitSpansSample,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  exitSpansSample: Map<string, ServiceMapSpan>;
  start: number;
  end: number;
}) {
  const optionalFields = asMutableArray([SERVICE_ENVIRONMENT] as const);
  const requiredFields = asMutableArray([SERVICE_NAME, AGENT_NAME, PARENT_ID] as const);

  const servicesResponse = await apmEventClient.search('get_transactions_from_exit_spans', {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    track_total_hits: false,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...termsQuery(PARENT_ID, ...exitSpansSample.keys())],
      },
    },
    size: exitSpansSample.size,
    fields: [...requiredFields, ...optionalFields],
  });

  const destinationsBySpanId = new Map(exitSpansSample);

  servicesResponse.hits.hits.forEach((hit) => {
    const transaction = unflattenKnownApmEventFields(hit.fields, [...requiredFields]);

    const spanId = transaction.parent.id;

    const destination = destinationsBySpanId.get(spanId);
    if (destination) {
      destinationsBySpanId.set(spanId, {
        ...destination,
        destinationService: {
          agentName: transaction.agent.name,
          serviceEnvironment: transaction.service.environment,
          serviceName: transaction.service.name,
        },
      });
    }
  });

  return Array.from(destinationsBySpanId.values());
}

async function fetchSpansFromSpanLinks({
  apmEventClient,
  outgoingSpanLinksSample,
  incomingSpanLinksSample,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  outgoingSpanLinksSample: Map<string, ServiceMapSpan>;
  incomingSpanLinksSample: Map<string, IncomingSpanLink>;
  start: number;
  end: number;
}) {
  const spanIds = new Set([...outgoingSpanLinksSample.keys(), ...incomingSpanLinksSample.keys()]);

  const servicesResponse = await apmEventClient.search('get_spans_for_span_links', {
    apm: {
      events: [ProcessorEvent.span],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...termsQuery(SPAN_ID, ...spanIds)],
      },
    },
    aggs: {
      links: {
        composite: {
          sources: asMutableArray([
            { serviceName: { terms: { field: SERVICE_NAME } } },
            {
              spanName: {
                terms: { field: SPAN_NAME },
              },
            },
          ] as const),
          size: MAX_SPAN_LINKS,
        },
        aggs: {
          sample: {
            top_metrics: {
              size: 1,
              sort: {
                [AT_TIMESTAMP]: 'asc' as const,
              },
              metrics: asMutableArray([
                { field: SPAN_ID },
                { field: SPAN_NAME },
                { field: SPAN_DESTINATION_SERVICE_RESOURCE },
                { field: SPAN_TYPE },
                { field: SPAN_SUBTYPE },
                { field: AGENT_NAME },
                { field: SERVICE_NAME },
                { field: SERVICE_ENVIRONMENT },
              ] as const),
            },
          },
        },
      },
    },
  });

  const spanLinksDestination = new Map<string, ServiceMapSpan>();

  servicesResponse.aggregations?.links.buckets.forEach((bucket) => {
    const sample = bucket?.sample.top[0]?.metrics;
    if (!sample) {
      return;
    }

    const spanId = sample[SPAN_ID] as string;

    const serviceFromSample = {
      agentName: sample[AGENT_NAME] as AgentName,
      serviceEnvironment: sample[SERVICE_ENVIRONMENT] as string,
      serviceName: sample[SERVICE_NAME] as string,
    };

    const outgoingDestination = outgoingSpanLinksSample.get(spanId);
    if (outgoingDestination) {
      spanLinksDestination.set(spanId, {
        ...outgoingDestination,
        spanDestinationServiceResource:
          outgoingDestination.spanDestinationServiceResource ?? bucket.key.spanName,
        destinationService: serviceFromSample,
      });
    }

    const incomingDestination = incomingSpanLinksSample.get(spanId);
    if (incomingDestination) {
      spanLinksDestination.set(spanId, {
        spanId,
        ...serviceFromSample,
        spanDestinationServiceResource: (sample[SPAN_DESTINATION_SERVICE_RESOURCE] ??
          sample[SPAN_NAME]) as string,
        spanType: sample[SPAN_TYPE] as string,
        spanSubtype: sample[SPAN_SUBTYPE] as string,
        destinationService: incomingDestination,
      });
    }
  });

  return Array.from(spanLinksDestination.values());
}
