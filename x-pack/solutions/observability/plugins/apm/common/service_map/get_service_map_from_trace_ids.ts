/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectionId } from './transform_service_map_responses';
import type { Connection, ConnectionNode } from '.';

export function getConnections(paths: ConnectionNode[][] | undefined): Connection[] {
  if (!paths) {
    return [];
  }

  const connectionsById = new Set<string>();
  const connections: Connection[] = [];

  paths.forEach((path) => {
    for (let i = 1; i < path.length; i++) {
      const connectionId = getConnectionId({ source: path[i - 1], destination: path[i] });

      if (!connectionsById.has(connectionId)) {
        connectionsById.add(connectionId);
        connections.push({ source: path[i - 1], destination: path[i] });
      }
    }
  });

  return connections;
}
