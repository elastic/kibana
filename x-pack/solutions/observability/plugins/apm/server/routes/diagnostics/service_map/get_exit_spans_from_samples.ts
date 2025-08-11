/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import type { ESSearchResponse, ESSearchRequest } from '@kbn/es-types';
import {
  SERVICE_NAME,
  SPAN_ID,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  TRACE_ID,
  TRANSACTION_ID,
  SPAN_NAME,
  SERVICE_NODE_NAME,
  AGENT_NAME,
  PARENT_ID,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '@kbn/apm-types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';

export async function getExitSpans({
  apmEventClient,
  start,
  end,
  destinationNode,
  ids,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  sourceNode: string;
  destinationNode: string;
  ids: string[];
}) {
  const requiredFields = asMutableArray([
    SERVICE_NAME,
    SPAN_ID,
    SPAN_TYPE,
    SPAN_SUBTYPE,
    TRACE_ID,
    TRANSACTION_ID,
    SPAN_NAME,
    SERVICE_NODE_NAME,
    AGENT_NAME,
  ] as const);

  const response = await apmEventClient.search('diagnostics_get_exit_spans_from_source_node', {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...termsQuery(PARENT_ID, ...ids)],
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
              size: 5,
            },
          },
        },
      },
      destination_services: {
        terms: {
          field: SERVICE_NAME,
          size: 50,
        },
        aggs: {
          sample_docs: {
            top_hits: {
              size: 5,
              fields: [...requiredFields],
            },
          },
        },
      },
    },
  });

  const apmExitSpans =
    response?.aggregations?.destination_services?.buckets?.map((item) => {
      const fields = unflattenKnownApmEventFields(item?.sample_docs?.hits?.hits?.[0]?.fields);

      return {
        destinationService: fields?.service?.name,
        spanSubType: fields?.span?.subtype ?? '',
        spanId: fields?.span?.id ?? '',
        spanType: fields?.span?.type ?? '',
        transactionId: fields?.transaction?.id ?? '',
        serviceNodeName: fields?.service?.node?.name ?? '',
        traceId: fields?.trace?.id ?? '',
        agentName: fields?.agent?.name ?? '',
        docCount: item?.doc_count ?? 0,
        isOtel: false,
      };
    }) ?? [];

  const matchingCount =
    response?.aggregations?.matching_destination_resources?.sample_docs?.hits?.total?.value || 0;
  return {
    apmExitSpans,
    totalConnections: apmExitSpans.length,
    rawResponse: response,
    hasMatchingDestinationResources: matchingCount > 0,
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
  spanIds: string[];
  sourceSpanIdsRawResponse: ESSearchResponse<unknown, ESSearchRequest>;
}> {
  const requiredFields = asMutableArray([SPAN_ID] as const);
  const response = await apmEventClient.search('diagnostics_get_source_node_span_samples', {
    apm: {
      events: [ProcessorEvent.span],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...termsQuery(SERVICE_NAME, sourceNode),
          ...termsQuery(TRACE_ID, ...traceIds),
        ],
      },
    },
    aggs: {
      sample_docs: {
        terms: {
          field: SPAN_NAME,
          size: 500,
        },
        aggs: {
          top_span_ids: {
            top_hits: {
              size: 10,
              fields: [...requiredFields],
            },
          },
        },
      },
    },
  });

  return {
    sourceSpanIdsRawResponse: response,
    spanIds:
      response.aggregations?.sample_docs?.buckets?.flatMap((bucket) => {
        const event = unflattenKnownApmEventFields(
          bucket.top_span_ids.hits.hits[0].fields,
          requiredFields
        );

        return event.span.id ?? [];
      }) ?? [],
  };
}

export async function getDestinationParentIds({
  apmEventClient,
  start,
  end,
  ids,
  destinationNode,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  ids: string[] | undefined;
  destinationNode: string;
}) {
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
          ...(ids ? termsQuery(PARENT_ID, ...ids) : []),
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
