/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, defer, concatMap, map, EMPTY } from 'rxjs';
import { existsQuery, rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { PassThrough } from 'stream';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
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

export function fetchServicePathsFromTraceIds({
  apmEventClient,
  traceIds,
  start,
  end,
  terminateAfter,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  start: number;
  end: number;
  terminateAfter: number;
}) {
  const stream = new PassThrough();

  defer(() =>
    from(fetchSpanIdsFromTraceIds({ apmEventClient, traceIds, terminateAfter, start, end })).pipe(
      concatMap((spanSamples) => {
        if (!spanSamples) {
          return EMPTY;
        }

        return from(
          fetchSpansFromParentIds({ apmEventClient, spanSamples, terminateAfter, start, end })
        ).pipe(map((spans) => JSON.stringify(Array.from(spans.values()))));
      })
    )
  ).subscribe({
    next: (event) => {
      if (!stream.write(event)) {
        stream.pause();
        stream.once('drain', () => stream.resume());
      }
    },
    error: (error) => {
      console.error(error);
      stream.end();
    },
    complete: () => {
      stream.end();
    },
  });

  return stream;
}

interface Destination {
  spanId: string;
  spanType: string;
  spanSubtype: string;
  spanDestinationServiceResource: string;
  serviceName: string;
  serviceEnvironment?: string;
  agentName: AgentName;
  downstreamService?: {
    agentName: AgentName;
    serviceEnvironment?: string;
    serviceName: string;
  };
}

async function fetchSpanIdsFromTraceIds({
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
  const sampleExitSpans = await apmEventClient.search('get_service_paths_parent_ids', {
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

  const destinationsBySpanId = new Map<string, Destination>();

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

async function fetchSpansFromParentIds({
  apmEventClient,
  spanSamples,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  spanSamples: Map<string, Destination>;
  terminateAfter: number;
  start: number;
  end: number;
}) {
  const optionalFields = asMutableArray([SERVICE_ENVIRONMENT] as const);
  const requiredFields = asMutableArray([SERVICE_NAME, AGENT_NAME, PARENT_ID] as const);

  const res = await apmEventClient.search('get_service_paths_parent_ids', {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end + 1000 * 1000 * 60 * 5),
            ...termsQuery(PARENT_ID, ...spanSamples.keys()),
          ],
        },
      },
      size: spanSamples.size,
      fields: [...requiredFields, ...optionalFields],
    },
  });

  const destinationsBySpanId = new Map(spanSamples);

  res.hits.hits.forEach((hit) => {
    const transaction = unflattenKnownApmEventFields(hit.fields, [...requiredFields]);
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

  return destinationsBySpanId;
}
