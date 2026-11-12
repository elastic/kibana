/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TINY_GROUP_MAX_SIZE } from './constants';
import type { WeightedEdge } from './types';
import { compareNames } from './utils';

/**
 * Moves each service in a group of 1 or 2 into the neighbouring group of 3 or more it shares the
 * most call weight with, taking services by name and breaking ties by the lowest group number.
 * Best effort: a service none of whose neighbours is in a group of 3 or more stays where it is.
 * Groups stay connected, since a service only moves into a group it calls or is called by.
 */
export function absorbTinyGroups({
  groups,
  edges,
}: {
  groups: ReadonlyMap<string, number>;
  /** Edges between the grouped services. */
  edges: readonly WeightedEdge[];
}): Map<string, number> {
  const result = new Map(groups);
  const sizes = new Map<number, number>();
  for (const group of result.values()) {
    sizes.set(group, (sizes.get(group) ?? 0) + 1);
  }

  // call weight from each service to each group around it, as the groups were before any move
  const weightToGroup = new Map<string, Map<number, number>>();
  for (const { source, target, weight } of edges) {
    for (const [service, other] of [
      [source, target],
      [target, source],
    ]) {
      const group = result.get(other);
      if (group === undefined) {
        continue;
      }
      const byGroup = weightToGroup.get(service) ?? new Map<number, number>();
      byGroup.set(group, (byGroup.get(group) ?? 0) + weight);
      weightToGroup.set(service, byGroup);
    }
  }

  for (const service of [...result.keys()].sort(compareNames)) {
    const own = result.get(service);
    if (own === undefined || (sizes.get(own) ?? 0) > TINY_GROUP_MAX_SIZE) {
      continue;
    }
    const [best] = [...(weightToGroup.get(service) ?? [])]
      .filter(([group]) => group !== own && (sizes.get(group) ?? 0) > TINY_GROUP_MAX_SIZE)
      .sort(([groupA, weightA], [groupB, weightB]) => weightB - weightA || groupA - groupB);
    if (best) {
      const [target] = best;
      sizes.set(own, (sizes.get(own) ?? 0) - 1);
      sizes.set(target, (sizes.get(target) ?? 0) + 1);
      result.set(service, target);
    }
  }
  return result;
}
