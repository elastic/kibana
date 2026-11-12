/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOT_CONNECTED_MAX_PIECE_SIZE } from './constants';
import type { WeightedEdge } from './types';
import { verifyEdges } from './utils';

/**
 * Services with no calls, and pieces of the call graph this small cut off from the rest. Runs on
 * the services left once shared ones are out, with the edges between them, so a service that only
 * calls shared services is not connected: it has nothing left to be grouped by.
 *
 * Expects clean edges, see `verifyEdges`.
 */
export function findNotConnected({
  services,
  edges,
}: {
  services: readonly string[];
  edges: readonly WeightedEdge[];
}): Set<string> {
  verifyEdges({ edges, services: new Set(services) });

  const neighbours = new Map<string, string[]>(services.map((service) => [service, []]));
  for (const { source, target } of edges) {
    neighbours.get(source)?.push(target);
    neighbours.get(target)?.push(source);
  }

  const notConnected = new Set<string>();
  const seen = new Set<string>();
  for (const start of services) {
    if (seen.has(start)) {
      continue;
    }
    seen.add(start);
    const piece = [start];
    for (let position = 0; position < piece.length; position++) {
      for (const next of neighbours.get(piece[position]) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          piece.push(next);
        }
      }
    }
    if (piece.length <= NOT_CONNECTED_MAX_PIECE_SIZE) {
      piece.forEach((service) => notConnected.add(service));
    }
  }
  return notConnected;
}
