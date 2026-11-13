/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WeightedEdge } from './types';

/** Orders by code unit, the same on every machine whatever its locale. */
export function compareNames(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The edges whose services are both among the given ones. */
export function edgesBetween({
  edges,
  services,
}: {
  edges: readonly WeightedEdge[];
  services: ReadonlySet<string>;
}): WeightedEdge[] {
  return edges.filter(({ source, target }) => services.has(source) && services.has(target));
}

/**
 * Checks every edge is one the grouping steps can use: both services among the given ones, not a
 * service calling itself, and a positive weight. Throws on the first that isn't.
 *
 * Edges should reach this function already clean: `getCallGraphEdges` drops calls to the service
 * itself and pairs with no calls, and callers keep only the edges between the services they group
 * with `edgesBetween`. A bad edge here means a caller has a bug, not that the data is unusual.
 *
 * Such an edge wouldn't fail on its own. One to a service not being grouped gives `NaN` gains in
 * community detection and pulls an outside service into a piece of the call graph, one from a
 * service to itself counts it as its own neighbour, and one with no weight joins services that
 * never call each other. In the end, each would silently give wrong groups, so this throws instead,
 * to make the bug loud: grouping fails and the map shows ungrouped.
 */
export function verifyEdges({
  edges,
  services,
}: {
  edges: readonly WeightedEdge[];
  services: ReadonlySet<string>;
}): void {
  for (const { source, target, weight } of edges) {
    if (!services.has(source) || !services.has(target)) {
      throw new Error(`Edge ${source} - ${target} has a service that isn't being grouped`);
    }
    if (source === target) {
      throw new Error(`Edge ${source} - ${target} connects a service to itself`);
    }
    if (!(weight > 0)) {
      throw new Error(`Edge ${source} - ${target} has weight ${weight}, not a positive number`);
    }
  }
}
