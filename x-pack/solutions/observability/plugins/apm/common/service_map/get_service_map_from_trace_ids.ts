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

  const connectionsById: Map<string, Connection> = new Map();

  paths.forEach((path) => {
    path.forEach((location, i) => {
      const prev = path[i - 1];

      if (prev) {
        const connection = {
          source: prev,
          destination: location,
        };

        const id = getConnectionId(connection);

        if (!connectionsById.has(id)) {
          connectionsById.set(id, connection);
        }
      }
    });
  });

  return Array.from(connectionsById.values());
}
