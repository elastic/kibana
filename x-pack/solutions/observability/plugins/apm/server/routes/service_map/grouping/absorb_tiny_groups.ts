/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TINY_GROUP_MAX_SIZE } from './constants';
import type { WeightedEdge } from './types';
import { groupSizes } from './utils';

/**
 * Moves each tiny group, of at most `TINY_GROUP_MAX_SIZE` services, as a whole into the larger
 * neighbouring group its services share the most call weight with, breaking ties by the lowest
 * group number. Moving the whole group keeps services that call each other together, even when
 * each of them also calls a different larger group.
 *
 * Repeats until nothing moves, so a tiny group whose only neighbour was another tiny group follows
 * it once that one has moved. Best effort: a tiny group with no larger neighbour stays as it is.
 * Groups stay connected, since a tiny group is connected and at least one of its services calls
 * into the group it joins.
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
  let moves = findMoves({ groups: result, edges });
  while (moves.size > 0) {
    for (const [service, group] of result) {
      const target = moves.get(group);
      if (target !== undefined) {
        result.set(service, target);
      }
    }
    moves = findMoves({ groups: result, edges });
  }
  return result;
}

/**
 * The larger group each tiny group moves into, keyed by the tiny group's number. Tiny groups only
 * move into larger groups, which only grow, so no move changes where another tiny group goes.
 */
function findMoves({
  groups,
  edges,
}: {
  groups: ReadonlyMap<string, number>;
  edges: readonly WeightedEdge[];
}): Map<number, number> {
  const sizes = groupSizes(groups);
  const isTiny = (group: number) => (sizes.get(group) ?? 0) <= TINY_GROUP_MAX_SIZE;

  // call weight from each tiny group into each larger group it touches
  const weightToGroup = new Map<number, Map<number, number>>();
  for (const { source, target, weight } of edges) {
    for (const [service, other] of [
      [source, target],
      [target, source],
    ]) {
      const own = groups.get(service);
      const neighbour = groups.get(other);
      if (own === undefined || neighbour === undefined || !isTiny(own) || isTiny(neighbour)) {
        continue;
      }
      const byGroup = weightToGroup.get(own) ?? new Map<number, number>();
      byGroup.set(neighbour, (byGroup.get(neighbour) ?? 0) + weight);
      weightToGroup.set(own, byGroup);
    }
  }

  return new Map(
    [...weightToGroup].map(([tiny, byGroup]): [number, number] => {
      const [[target]] = [...byGroup].sort(
        ([groupA, weightA], [groupB, weightB]) => weightB - weightA || groupA - groupB
      );
      return [tiny, target];
    })
  );
}
