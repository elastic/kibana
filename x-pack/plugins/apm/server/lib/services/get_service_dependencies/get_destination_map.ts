/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, keyBy, mapValues } from 'lodash';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { pickKeys } from '../../../../common/utils/pick_keys';
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
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { rangeQuery } from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { withApmSpan } from '../../../utils/with_apm_span';

export const getDestinationMap = ({
  setup,
  serviceName,
  environment,
}: {
  setup: Setup & SetupTimeRange;
  serviceName: string;
  environment?: string;
}) => {
  return withApmSpan('get_service_destination_map', async () => {
    const { start, end, apmEventClient } = setup;

    const response = await apmEventClient.search('get_exit_span_samples', {
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
    });

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

    const transactionResponse = await apmEventClient.search(
      'get_transactions_for_exit_spans',
      {
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
      }
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

    // we could have multiple connections per address because
    // of multiple event outcomes
    const dedupedConnectionsByAddress = joinByKey(
      joinedBySpanId,
      SPAN_DESTINATION_SERVICE_RESOURCE
    );

    // identify a connection by either service.name, service.environment, agent.name
    // OR span.destination.service.resource

    const connectionsWithId = dedupedConnectionsByAddress.map((connection) => {
      const id =
        'service' in connection
          ? { service: connection.service }
          : pickKeys(connection, SPAN_DESTINATION_SERVICE_RESOURCE);

      return {
        ...connection,
        id,
      };
    });

    const dedupedConnectionsById = joinByKey(connectionsWithId, 'id');

    const connectionsByAddress = keyBy(
      connectionsWithId,
      SPAN_DESTINATION_SERVICE_RESOURCE
    );

    // per span.destination.service.resource, return merged/deduped item
    return mapValues(connectionsByAddress, ({ id }) => {
      const connection = dedupedConnectionsById.find((dedupedConnection) =>
        isEqual(id, dedupedConnection.id)
      )!;

      return {
        id,
        span: {
          type: connection[SPAN_TYPE],
          subtype: connection[SPAN_SUBTYPE],
          destination: {
            service: {
              resource: connection[SPAN_DESTINATION_SERVICE_RESOURCE],
            },
          },
        },
        ...('service' in connection && connection.service
          ? {
              service: {
                name: connection.service.name,
                environment: connection.service.environment,
              },
              agent: {
                name: connection.service.agentName,
              },
            }
          : {}),
      };
    });
  });
};
