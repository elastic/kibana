/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../../common/elasticsearch_fieldnames';
import { Connections } from './get_connections';

function removeUndefined(
  item: Connections[0] | undefined
): item is Connections[0] {
  return !!item;
}

export function findCommonConnections({
  currentPeriodConnections,
  previousPeriodConnections = [],
}: {
  currentPeriodConnections: Connections;
  previousPeriodConnections?: Connections;
}) {
  const currentPeriodConnectionsMap: Record<
    string,
    Connections
  > = currentPeriodConnections.reduce((acc, curr) => {
    if (curr.service?.name) {
      const serviceName = curr.service.name;
      return { ...acc, [serviceName]: curr };
    }
    const destinationSource = curr[SPAN_DESTINATION_SERVICE_RESOURCE];
    if (destinationSource) {
      return { ...acc, [destinationSource]: curr };
    }
    return acc;
  }, {});

  return previousPeriodConnections
    .map((item) => {
      const serviceName = item.service?.name;
      const destinationServiceResource =
        item['span.destination.service.resource'];

      if (
        (serviceName && currentPeriodConnectionsMap[serviceName]) ||
        (destinationServiceResource &&
          currentPeriodConnectionsMap[destinationServiceResource])
      ) {
        return item;
      }
    })
    .filter(removeUndefined);
}
