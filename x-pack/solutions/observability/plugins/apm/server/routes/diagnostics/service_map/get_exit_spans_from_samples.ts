/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import type { ESSearchResponse, ESSearchRequest } from '@kbn/es-types';
import {
  SERVICE_NAME,
  SPAN_ID,
  TRACE_ID,
  TRANSACTION_ID,
  SPAN_NAME,
  SERVICE_NODE_NAME,
  AGENT_NAME,
  PARENT_ID,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '@kbn/apm-types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { ExitSpanFields } from '../../../../common/service_map_diagnostic_types';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { compactMap } from '../../../utils/compact_map';

type DestinationsBySpanId = Map<string, string | undefined>;

export async function getExitSpans({
  apmEventClient,
  start,
  end,
  destinationNode,
  parentSpans,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  sourceNode: string;
  destinationNode: string;
  parentSpans: DestinationsBySpanId;
}) {
  const requiredFields = asMutableArray([
    SERVICE_NAME,
    SPAN_ID,
    TRACE_ID,
    TRANSACTION_ID,
    SPAN_NAME,
    SERVICE_NODE_NAME,
    AGENT_NAME,
    PARENT_ID,
  ] as const);

  const parentSpanIds = Array.from(parentSpans.keys());

  const response = await apmEventClient.search('diagnostics_get_exit_spans_from_source_node', {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...termsQuery(PARENT_ID, ...parentSpanIds)],
      },
    },
    aggs: {
      matching_destination_resources: {
        filter: {
          term: {
            [SERVICE_NAME]: destinationNode,
          },
        },
        aggs: {
          sample_docs: {
            top_hits: {
              size: 50,
              fields: [...requiredFields],
            },
          },
        },
      },
    },
  });

  const hits =
    response?.aggregations?.matching_destination_resources?.sample_docs?.hits?.hits ?? [];

  const apmExitSpans = compactMap(hits, (hit) => {
    const fields = hit?.fields && accessKnownApmEventFields(hit.fields);

    const parentId = fields?.[PARENT_ID];

    if (!fields || !parentId || !parentSpans.get(parentId)) {
      return;
    }

    return {
      destinationService: fields[SERVICE_NAME] ?? '',
      spanId: fields[SPAN_ID] ?? '',
      transactionId: fields[TRANSACTION_ID] ?? '',
      serviceNodeName: fields[SERVICE_NODE_NAME] ?? '',
      traceId: fields[TRACE_ID] ?? '',
      agentName: fields[AGENT_NAME] ?? '',
    } satisfies ExitSpanFields;
  });

  return {
    apmExitSpans,
    totalConnections: apmExitSpans.length,
    rawResponse: response,
    hasMatchingDestinationResources: apmExitSpans.length > 0,
  };
}

export async function getSourceSpanIds({
  apmEventClient,
  start,
  end,
  sourceNode,
  traceIds,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  sourceNode: string;
  traceIds: string[];
}): Promise<{
  destinationsBySpanId: DestinationsBySpanId;
  sourceSpanIdsRawResponse: ESSearchResponse<unknown, ESSearchRequest>;
}> {
  const requiredFields = asMutableArray([SPAN_ID] as const);
  const optionalFields = asMutableArray([SPAN_DESTINATION_SERVICE_RESOURCE] as const);
  const response = await apmEventClient.search('diagnostics_get_source_node_span_samples', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...termsQuery(TRACE_ID, ...traceIds)],
      },
    },
    aggs: {
      sample_docs: {
        composite: {
          size: 1000,
          sources: asMutableArray([
            {
              serviceName: {
                terms: {
                  field: SERVICE_NAME,
                },
              },
            },
            {
              spanName: {
                terms: {
                  field: SPAN_NAME,
                },
              },
            },
          ] as const),
        },
        aggs: {
          top_span_ids: {
            top_hits: {
              size: 10,
              fields: [...requiredFields, ...optionalFields],
            },
          },
        },
      },
    },
  });

  const destinationsBySpanId: DestinationsBySpanId = new Map();

  return {
    sourceSpanIdsRawResponse: response,
    destinationsBySpanId:
      response.aggregations?.sample_docs?.buckets?.reduce((acc, bucket) => {
        const event = accessKnownApmEventFields(
          bucket.top_span_ids.hits.hits[0].fields
        ).requireFields(requiredFields);
        acc.set(event[SPAN_ID], event[SPAN_DESTINATION_SERVICE_RESOURCE]);
        return acc;
      }, destinationsBySpanId) ?? destinationsBySpanId,
  };
}

export async function getDestinationParentIds({
  apmEventClient,
  start,
  end,
  parentSpans,
  destinationNode,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  parentSpans: DestinationsBySpanId;
  destinationNode: string;
}) {
  const parentSpanIds = Array.from(parentSpans.keys());

  const response = await apmEventClient.search('diagnostics_get_destination_node_parent_ids', {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    track_total_hits: false,
    size: 1,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...(parentSpanIds ? termsQuery(PARENT_ID, ...parentSpanIds) : []),
          ...termQuery(SERVICE_NAME, destinationNode),
        ],
      },
    },
    aggs: {
      sample_docs: {
        top_hits: {
          size: 5,
          fields: [PARENT_ID, SERVICE_NAME, SPAN_DESTINATION_SERVICE_RESOURCE],
        },
      },
    },
  });

  return { rawResponse: response, hasParent: response.hits.hits.length > 0 };
}
