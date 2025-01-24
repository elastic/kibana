/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { existsQuery, rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { chunk } from 'lodash';
import type { ServiceMapSpan } from '../../../common/service_map/typings';
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
} from '../../../common/es_fields/apm';

export async function fetchPathsFromTraceIds({
  apmEventClient,
  traceIds,
  start,
  end,
  terminateAfter,
  logger,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  start: number;
  end: number;
  terminateAfter: number;
  logger: Logger;
}) {
  logger.debug(`Fetching spans (${traceIds.length} traces)`);

  const exitSpansSample = await fetchExitSpanIdsFromTraceIds({
    apmEventClient,
    traceIds,
    start,
    end,
    terminateAfter,
  });

  const entries = Array.from(exitSpansSample.entries());
  const chunkedExitSpansSample = chunk(entries, 1_000).map(
    (chunkedEntries) => new Map(chunkedEntries)
  );
  const transactionsFromExitSpans = await Promise.all(
    chunkedExitSpansSample.map((sample) =>
      fetchTransactionsFromExitSpans({
        apmEventClient,
        exitSpansSample: sample,
        start,
        end,
        terminateAfter,
      })
    )
  );

  return transactionsFromExitSpans.reduce((acc, spans) => {
    return acc.concat(spans);
  }, [] as ServiceMapSpan[]);
}

async function fetchExitSpanIdsFromTraceIds({
  apmEventClient,
  traceIds,
  terminateAfter,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  terminateAfter: number;
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
            size: terminateAfter,
          },
          aggs: {
            eventOutcomeGroup: {
              filters: {
                filters: {
                  success: {
                    term: {
                      [EVENT_OUTCOME]: 'success' as const,
                    },
                  },
                  others: {
                    bool: {
                      must_not: {
                        term: {
                          [EVENT_OUTCOME]: 'success' as const,
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
                      '@timestamp': 'asc',
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
    const eventOutcomeGroup =
      bucket.eventOutcomeGroup.buckets.success.sample.top.length > 0
        ? bucket.eventOutcomeGroup.buckets.success
        : bucket.eventOutcomeGroup.buckets.others.sample.top.length > 0
        ? bucket.eventOutcomeGroup.buckets.others
        : undefined;

    const sample = eventOutcomeGroup?.sample.top[0].metrics;
    if (!sample) {
      return;
    }

    const spanId = sample[SPAN_ID] as string;
    if (!sample || !spanId) {
      return;
    }

    destinationsBySpanId.set(spanId, {
      spanDestinationServiceResource: bucket.key.spanDestinationServiceResource as string,
      spanId: spanId as string,
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
  exitSpansSample: exitSpansSample,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  exitSpansSample: Map<string, ServiceMapSpan>;
  terminateAfter: number;
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
    let transaction;
    try {
      transaction = unflattenKnownApmEventFields(hit.fields, [...requiredFields]);
    } catch (e) {
      console.error('Failed to unflatten transaction', e);
      return;
    }

    const spanId = transaction.parent.id;

    const destination = destinationsBySpanId.get(spanId);
    if (destination) {
      destinationsBySpanId.set(spanId, {
        ...destination,
        downstreamService: {
          agentName: transaction.agent.name,
          serviceEnvironment: transaction.service.environment,
          serviceName: transaction.service.name,
        },
      });
    }
  });

  return Array.from(destinationsBySpanId.values());
}
