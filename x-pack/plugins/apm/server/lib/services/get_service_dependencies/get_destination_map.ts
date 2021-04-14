/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, keyBy, mapValues } from 'lodash';
import { pickKeys } from '../../../../common/utils/pick_keys';
import {
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { Connections } from './get_connections';

export function getDestinationMaps(connections: Connections) {
  // we could have multiple connections per address because of multiple event outcomes
  const dedupedConnectionsByAddress = joinByKey(
    connections,
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
}
