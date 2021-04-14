/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromiseReturnType } from '../../../../../observability/typings/common';
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
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { environmentQuery, rangeQuery } from '../../../../server/utils/queries';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Setup } from '../../helpers/setup_request';

export type Connections = PromiseReturnType<typeof getConnections>;

export const getConnections = ({
  setup,
  serviceName,
  environment,
  start,
  end,
}: {
  setup: Setup;
  serviceName: string;
  environment?: string;
  start: number;
  end: number;
}) => {
  return withApmSpan('get_service_destination_map', async () => {
    const { apmEventClient } = setup;

    const response = await withApmSpan('get_exit_span_samples', async () =>
      apmEventClient.search({
        apm: {
          events: [ProcessorEvent.span],
        },
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { [SERVICE_NAME]: serviceName } },
                { exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE } },
                ...rangeQuery(start, end),
                ...environmentQuery(environment),
              ],
            },
          },
          aggs: {
            connections: {
              composite: {
                size: 1000,
                sources: asMutableArray([
                  {
                    [SPAN_DESTINATION_SERVICE_RESOURCE]: {
                      terms: { field: SPAN_DESTINATION_SERVICE_RESOURCE },
                    },
                  },
                  // make sure we get samples for both successful
                  // and failed calls
                  { [EVENT_OUTCOME]: { terms: { field: EVENT_OUTCOME } } },
                ] as const),
              },
              aggs: {
                sample: {
                  top_hits: {
                    size: 1,
                    _source: [SPAN_TYPE, SPAN_SUBTYPE, SPAN_ID],
                    sort: [
                      {
                        '@timestamp': 'desc' as const,
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      })
    );

    const outgoingConnections =
      response.aggregations?.connections.buckets.map((bucket) => {
        const sample = bucket.sample.hits.hits[0]._source;

        return {
          [SPAN_DESTINATION_SERVICE_RESOURCE]: String(
            bucket.key[SPAN_DESTINATION_SERVICE_RESOURCE]
          ),
          [SPAN_ID]: sample.span.id,
          [SPAN_TYPE]: sample.span.type,
          [SPAN_SUBTYPE]: sample.span.subtype,
        };
      }) ?? [];

    const transactionResponse = await withApmSpan(
      'get_transactions_for_exit_spans',
      () =>
        apmEventClient.search({
          apm: {
            events: [ProcessorEvent.transaction],
          },
          body: {
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      [PARENT_ID]: outgoingConnections.map(
                        (connection) => connection[SPAN_ID]
                      ),
                    },
                  },
                  ...rangeQuery(start, end),
                ],
              },
            },
            size: outgoingConnections.length,
            docvalue_fields: asMutableArray([
              SERVICE_NAME,
              SERVICE_ENVIRONMENT,
              AGENT_NAME,
              PARENT_ID,
            ] as const),
            _source: false,
          },
        })
    );

    const incomingConnections = transactionResponse.hits.hits.map((hit) => ({
      [SPAN_ID]: String(hit.fields[PARENT_ID]![0]),
      service: {
        name: String(hit.fields[SERVICE_NAME]![0]),
        environment: String(hit.fields[SERVICE_ENVIRONMENT]?.[0] ?? ''),
        agentName: hit.fields[AGENT_NAME]![0] as AgentName,
      },
    }));

    // merge outgoing spans with transactions by span.id/parent.id
    const joinedBySpanId = joinByKey(
      [...outgoingConnections, ...incomingConnections],
      SPAN_ID
    );
    return joinedBySpanId;
  });
};
