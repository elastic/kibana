/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, rangeQuery, existsQuery, termsQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SPAN_DESTINATION_SERVICE_RESOURCE, SPAN_ID, PARENT_ID } from '@kbn/apm-types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';

/**
 * Fetch exit spans for a given service, grouped by destination resource, with a sample doc for each.
 * @param start Start time (epoch ms)
 * @param end End time (epoch ms)
 * @param serviceName Service name to filter on
 */
export async function getExitSpansFromSourceNode({
  apmEventClient,
  start,
  end,
  sourceNode,
  destinationNode,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  sourceNode: { field: string; value: string };
  destinationNode: { field: string; value: string };
}) {
  const response = await apmEventClient.search('diagnostics_get_exit_spans_from_node', {
    apm: {
      events: [ProcessorEvent.span],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...termQuery(sourceNode.field, sourceNode.value)],
      },
    },
    aggs: {
      matching_destination_resources: {
        filter: {
          term: {
            [SPAN_DESTINATION_SERVICE_RESOURCE]: destinationNode.value,
          },
        },
        aggs: {
          sample_doc: {
            top_hits: {
              size: 1,
            },
          },
        },
      },
      destination_resources: {
        terms: {
          field: SPAN_DESTINATION_SERVICE_RESOURCE,
          size: 50,
        },
        aggs: {
          sample_doc: {
            top_hits: {
              size: 5,
            },
          },
        },
      },
      otel_destination_resources: {
        terms: {
          field: 'destination.address',
          size: 50,
        },
        aggs: {
          sample_doc: {
            top_hits: {
              size: 5,
            },
          },
        },
      },
    },
  });

  const exitSpans =
    response?.aggregations?.destination_resources?.buckets?.map((item: any) => {
      const doc = item?.sample_doc?.hits?.hits?.[0]?._source;
      return {
        destinationService: doc?.span?.destination?.service?.resource ?? '',
        spanSubType: doc?.span?.subtype ?? '',
        spanId: doc?.span?.id ?? '',
        spanType: doc?.span?.type ?? '',
        transactionId: doc?.transaction?.id ?? '',
        serviceNodeName: doc?.service?.node?.name ?? '',
        traceId: doc?.trace?.id ?? '',
        docCount: item?.doc_count ?? 0,
      };
    }) || [];

  return {
    exitSpans,
    totalConnections: exitSpans.length,
    rawResponse: response,
    hasMatchingDestinationResources:
      response?.aggregations?.matching_destination_resources?.sample_doc?.hits?.total?.value > 0,
  };
}

/**
 * Fetch exit spans for a given service, grouped by destination resource, with a sample doc for each.
 * @param start Start time (epoch ms)
 * @param end End time (epoch ms)
 * @param sourceNodeKql Service name to filter on
 */
export async function getSourceSpanIds({
  apmEventClient,
  start,
  end,
  sourceNode,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  sourceNode: { field: string; value: string };
}) {
  const response = await apmEventClient.search('diagnostics_get_source_span_ids', {
    apm: {
      events: [ProcessorEvent.span],
    },
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...existsQuery(SPAN_ID),
          ...termsQuery(sourceNode.field, sourceNode.value),
        ],
      },
    },
    aggs: {
      span_ids: {
        terms: {
          field: SPAN_ID,
          size: 100,
        },
      },
    },
  });

  return {
    sourceSpanIdsRawResponse: response,
    spanIds: response.aggregations?.span_ids?.buckets?.map((bucket) => bucket.key) ?? [],
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
  destinationNode: { field: string; value: string };
}) {
  const response = await apmEventClient.search('diagnostics_get_destination_parent_ids', {
    apm: {
      events: [ProcessorEvent.span],
    },
    track_total_hits: false,
    size: 2,
    terminate_after: 1,
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          ...termQuery(destinationNode.field, destinationNode.value),
          ...(ids ? termsQuery(PARENT_ID, ...ids) : []),
        ],
      },
    },
  });

  return { response, hasParent: response.hits.hits.length > 0 };
}
