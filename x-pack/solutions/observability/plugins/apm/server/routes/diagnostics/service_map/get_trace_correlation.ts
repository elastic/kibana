/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { SERVICE_NAME, TRACE_ID } from '@kbn/apm-types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';

export async function getTraceCorrelation({
  apmEventClient,
  start,
  end,
  traceId,
  sourceNode,
  destinationNode,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  traceId?: string;
  sourceNode: string;
  destinationNode: string;
}) {
  const response = await apmEventClient.search('diagnostics_get_trace_correlation', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    track_total_hits: true,
    size: 0,
    query: {
      bool: {
        filter: [...rangeQuery(start, end), ...termQuery(TRACE_ID, traceId)],
      },
    },
    aggs: {
      source_node_traces: {
        filter: {
          term: {
            [SERVICE_NAME]: sourceNode,
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
      destination_node_traces: {
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
    },
  });

  const sourceNodeCount =
    response.aggregations?.source_node_traces?.sample_docs?.hits?.total?.value || 0;
  const destinationNodeCount =
    response.aggregations?.destination_node_traces?.sample_docs?.hits?.total?.value || 0;

  return {
    foundInSourceNode: sourceNodeCount > 0,
    foundInDestinationNode: destinationNodeCount > 0,
    foundInBothNodes: destinationNodeCount > 0 && sourceNodeCount > 0,
    sourceNodeDocumentCount: sourceNodeCount,
    destinationNodeDocumentCount: destinationNodeCount,
    rawResponse: response,
  };
}
