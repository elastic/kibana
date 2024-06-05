/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import objectHash from 'object-hash';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../common/environment_filter_values';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import {
  AGENT_NAME,
  EVENT_OUTCOME,
  PARENT_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../../common/es_fields/apm';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Node, NodeType } from '../../../../common/connections';
import { excludeRumExitSpansQuery } from '../exclude_rum_exit_spans_query';
import { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../helpers/get_random_sampler';

type Destination = {
  dependencyName: string;
  spanId: string;
  spanType: string;
  spanSubtype: string;
} & (
  | {}
  | {
      serviceName: string;
      agentName: AgentName;
      environment: string;
    }
);

// This operation tries to find a service for a dependency, by:
// - getting a span for each value of span.destination.service.resource (which indicates an outgoing call)
// - for each span, find the transaction it creates
// - if there is a transaction, match the dependency name (span.destination.service.resource) to a service
export const getDestinationMap = ({
  apmEventClient,
  start,
  end,
  filter,
  offset,
  randomSampler,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  filter: QueryDslQueryContainer[];
  offset?: string;
  randomSampler: RandomSampler;
}) => {
  return withApmSpan('get_destination_map', async () => {
    const { startWithOffset, endWithOffset } = getOffsetInMs({
      start,
      end,
      offset,
    });

    const query: QueryDslQueryContainer = {
      bool: {
        filter: [
          { exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE } },
          ...rangeQuery(startWithOffset, endWithOffset),
          ...filter,
          ...excludeRumExitSpansQuery(),
        ],
      },
    };

    const hitCountResponse = await apmEventClient.search('get_exit_span_doc_count', {
      apm: {
        events: [ProcessorEvent.span],
      },
      body: {
        size: 0,
        track_total_hits: true,
        query,
      },
    });

    const totalDocCount = hitCountResponse.hits.total.value;
    const rawSamplingProbability = Math.min(10_000_000 / totalDocCount, 1);
    const samplingProbability =
      rawSamplingProbability < 0.5 ? rawSamplingProbability : randomSampler.probability;

    const response = await apmEventClient.search('get_exit_span_samples', {
      apm: {
        events: [ProcessorEvent.span],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query,
        aggs: {
          sampling: {
            random_sampler: {
              ...randomSampler,
              probability: samplingProbability,
            },
            aggs: {
              connections: {
                composite: {
                  size: 10000,
                  sources: asMutableArray([
                    {
                      dependencyName: {
                        terms: { field: SPAN_DESTINATION_SERVICE_RESOURCE },
                      },
                    },
                    // make sure we get samples for both successful
                    // and failed calls
                    { eventOutcome: { terms: { field: EVENT_OUTCOME } } },
                  ] as const),
                },
                aggs: {
                  sample: {
                    top_metrics: {
                      size: 1,
                      metrics: asMutableArray([
                        { field: SPAN_TYPE },
                        { field: SPAN_SUBTYPE },
                        { field: SPAN_ID },
                      ] as const),
                      sort: [
                        {
                          '@timestamp': 'asc' as const,
                        },
                      ],
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

    response.aggregations?.sampling.connections.buckets.forEach((bucket) => {
      const sample = bucket.sample.top[0].metrics;

      const spanId = sample[SPAN_ID] as string;

      destinationsBySpanId.set(spanId, {
        dependencyName: bucket.key.dependencyName as string,
        spanId,
        spanType: (sample[SPAN_TYPE] as string | null) || '',
        spanSubtype: (sample[SPAN_SUBTYPE] as string | null) || '',
      });
    });

    const transactionResponse = await apmEventClient.search('get_transactions_for_exit_spans', {
      apm: {
        events: [ProcessorEvent.transaction],
      },
      body: {
        track_total_hits: false,
        query: {
          bool: {
            filter: [
              {
                terms: {
                  [PARENT_ID]: Array.from(destinationsBySpanId.keys()),
                },
              },
              // add a 5m buffer at the end of the time range for long running spans
              ...rangeQuery(startWithOffset, endWithOffset + 1000 * 1000 * 60 * 5),
            ],
          },
        },
        size: destinationsBySpanId.size,
        fields: asMutableArray([SERVICE_NAME, SERVICE_ENVIRONMENT, AGENT_NAME, PARENT_ID] as const),
        _source: false,
      },
    });

    transactionResponse.hits.hits.forEach((hit) => {
      const spanId = String(hit.fields[PARENT_ID]![0]);
      const destination = destinationsBySpanId.get(spanId);

      if (destination) {
        destinationsBySpanId.set(spanId, {
          ...destination,
          serviceName: String(hit.fields[SERVICE_NAME]![0]),
          environment: String(
            hit.fields[SERVICE_ENVIRONMENT]?.[0] ?? ENVIRONMENT_NOT_DEFINED.value
          ),
          agentName: hit.fields[AGENT_NAME]![0] as AgentName,
        });
      }
    });

    const nodesBydependencyName = new Map<string, Node>();

    destinationsBySpanId.forEach((destination) => {
      const existingDestination = nodesBydependencyName.get(destination.dependencyName) ?? {};

      const mergedDestination = {
        ...existingDestination,
        ...destination,
      };

      let node: Node;
      if ('serviceName' in mergedDestination) {
        node = {
          serviceName: mergedDestination.serviceName,
          agentName: mergedDestination.agentName,
          environment: mergedDestination.environment,
          id: objectHash({ serviceName: mergedDestination.serviceName }),
          type: NodeType.service,
          dependencyName: mergedDestination.dependencyName,
        };
      } else {
        node = {
          dependencyName: mergedDestination.dependencyName,
          spanType: mergedDestination.spanType,
          spanSubtype: mergedDestination.spanSubtype,
          id: objectHash({ dependencyName: mergedDestination.dependencyName }),
          type: NodeType.dependency,
        };
      }

      nodesBydependencyName.set(destination.dependencyName, node);
    });

    return { nodesBydependencyName, sampled: samplingProbability !== 1 };
  });
};
