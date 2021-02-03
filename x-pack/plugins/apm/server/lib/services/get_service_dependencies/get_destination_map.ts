/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual, keyBy, mapValues } from 'lodash';
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
import { rangeFilter } from '../../../../common/utils/range_filter';
import { ProcessorEvent } from '../../../../common/processor_event';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

export const getDestinationMap = async ({
  setup,
  serviceName,
  environment,
}: {
  setup: Setup & SetupTimeRange;
  serviceName: string;
  environment: string;
}) => {
  const { start, end, apmEventClient } = setup;

  const response = await apmEventClient.search({
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
            { range: rangeFilter(start, end) },
            ...getEnvironmentUiFilterES(environment),
          ],
        },
      },
      aggs: {
        connections: {
          composite: {
            size: 1000,
            sources: [
              {
                [SPAN_DESTINATION_SERVICE_RESOURCE]: {
                  terms: { field: SPAN_DESTINATION_SERVICE_RESOURCE },
                },
              },
              // make sure we get samples for both successful
              // and failed calls
              { [EVENT_OUTCOME]: { terms: { field: EVENT_OUTCOME } } },
            ],
          },
          aggs: {
            docs: {
              top_hits: {
                docvalue_fields: [SPAN_TYPE, SPAN_SUBTYPE, SPAN_ID] as const,
                _source: false,
                sort: {
                  '@timestamp': 'desc',
                },
              },
            },
          },
        },
      },
    },
  });

  const outgoingConnections =
    response.aggregations?.connections.buckets.map((bucket) => {
      const doc = bucket.docs.hits.hits[0];

      return {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: String(
          bucket.key[SPAN_DESTINATION_SERVICE_RESOURCE]
        ),
        [SPAN_ID]: String(doc.fields[SPAN_ID]?.[0]),
        [SPAN_TYPE]: String(doc.fields[SPAN_TYPE]?.[0] ?? ''),
        [SPAN_SUBTYPE]: String(doc.fields[SPAN_SUBTYPE]?.[0] ?? ''),
      };
    }) ?? [];

  const transactionResponse = await apmEventClient.search({
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
            { range: rangeFilter(start, end) },
          ],
        },
      },
      size: outgoingConnections.length,
      docvalue_fields: [
        SERVICE_NAME,
        SERVICE_ENVIRONMENT,
        AGENT_NAME,
        PARENT_ID,
      ] as const,
      _source: false,
    },
  });

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
};
