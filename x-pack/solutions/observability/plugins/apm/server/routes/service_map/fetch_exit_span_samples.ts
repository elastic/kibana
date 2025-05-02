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
import type { ServiceMapSpan } from '../../../common/service_map/types';
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
} from '../../../common/es_fields/apm';

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
  const exitSpansSample = await fetchExitSpanIdsFromTraceIds({
    apmEventClient,
    traceIds,
    start,
    end,
  });

  const transactionsFromExitSpans = await fetchTransactionsFromExitSpans({
    apmEventClient,
    exitSpansSample,
    start,
    end,
  });

  return transactionsFromExitSpans;
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
    body: {
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
            size: 10000,
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

  const servicesResponse = await apmEventClient.search('get_transactions_for_exit_spans', {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      track_total_hits: false,
      query: {
        bool: {
          filter: [...rangeQuery(start, end), ...termsQuery(PARENT_ID, ...exitSpansSample.keys())],
        },
      },
      size: exitSpansSample.size,
      fields: [...requiredFields, ...optionalFields],
    },
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
