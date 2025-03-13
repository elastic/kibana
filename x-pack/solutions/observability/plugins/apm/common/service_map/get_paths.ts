/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectionNode, ExitSpanDestination, ServiceMapSpan } from './types';
import { getConnections, getExternalConnectionNode, getServiceConnectionNode } from './utils';

export const getPaths = ({ spans }: { spans: ServiceMapSpan[] }) => {
  const connections: ConnectionNode[][] = [];
  const exitSpanDestinations: ExitSpanDestination[] = [];

  for (const currentNode of spans) {
    const exitSpanNode = getExternalConnectionNode(currentNode);
    const serviceNode = getServiceConnectionNode(currentNode);

    if (currentNode.destinationService) {
      // maps an exit span to its destination service
      exitSpanDestinations.push({
        from: exitSpanNode,
        to: getServiceConnectionNode(currentNode.destinationService),
      });
    }

    // builds a connection between a service and an exit span
    connections.push([serviceNode, exitSpanNode]);
  }

  return {
    connections: getConnections(connections),
    exitSpanDestinations,
  };
};
