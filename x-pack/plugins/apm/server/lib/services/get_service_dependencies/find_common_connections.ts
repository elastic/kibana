/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
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
  const currentPeriodConnectionsMap = keyBy(
    currentPeriodConnections,
    (item) => {
      const serviceName = item.service?.name;
      return serviceName
        ? serviceName
        : item[SPAN_DESTINATION_SERVICE_RESOURCE];
    }
  );

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
