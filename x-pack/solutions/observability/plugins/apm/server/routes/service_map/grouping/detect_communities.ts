/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Finds groups of services that call each other more than chance would give. Louvain modularity
 * optimisation (Blondel et al. 2008), a last pass moving single services, then the guarantee
 * Leiden adds (Traag et al. 2019): every group is connected. Deterministic: the same services and
 * edges give the same groups, whatever order they arrive in.
 */

import type { WeightedEdge } from './types';
import {
  COMMUNITY_DETECTION_GAIN_TOLERANCE,
  COMMUNITY_DETECTION_MAX_LEVELS,
  COMMUNITY_DETECTION_MAX_PASSES,
} from './constants';
import { compareNames } from './utils';

interface Level {
  /** Each node's neighbours and the weight between them. A node is a service, then a group. */
  adjacency: Array<Map<number, number>>;
  /** Weight inside each node, once it stands for a group. */
  selfLoops: number[];
}

/**
 * A group number for every service, numbered from 0 in the order of each group's first service
 * by name. Higher resolutions give more, smaller groups.
 *
 * Expects clean edges, as `getCallGraphEdges` and `edgesBetween` give: one per pair, positive
 * weights, no service calling itself, both services among those being grouped. Throws otherwise.
 */
export function detectCommunities({
  services,
  edges,
  resolution = 1,
}: {
  services: readonly string[];
  edges: readonly WeightedEdge[];
  resolution?: number;
}): Map<string, number> {
  const sorted = [...new Set(services)].sort(compareNames);
  const original = buildLevel({ services: sorted, edges });

  let level = original;
  // the top-level node each service belongs to
  let membership = sorted.map((_, index) => index);
  for (let depth = 0; depth < COMMUNITY_DETECTION_MAX_LEVELS; depth++) {
    const community = moveNodes({ level, resolution });
    const { next, index } = aggregate({ level, community });
    membership = membership.map((node) => index[node]);
    if (next.adjacency.length === level.adjacency.length) {
      break;
    }
    level = next;
  }

  // Merges are final, so a service merged early into the wrong group would stay there:
  // one last pass moves single services between the finished groups.
  membership = moveNodes({ level: original, resolution, initial: membership });

  const pieces = splitDisconnected({ adjacency: original.adjacency, membership });
  return new Map(sorted.map((service, index) => [service, pieces[index]]));
}

/** Indexes the services and adds each edge to both of its ends, neighbours in index order. */
function buildLevel({
  services,
  edges,
}: {
  services: readonly string[];
  edges: readonly WeightedEdge[];
}): Level {
  const indexOf = new Map(services.map((service, index) => [service, index]));
  const neighbours = services.map(() => new Map<number, number>());
  for (const edge of edges) {
    const { a, b } = extractAndValidateEdgeServices({ edge, indexOf });
    neighbours[a].set(b, (neighbours[a].get(b) ?? 0) + edge.weight);
    neighbours[b].set(a, (neighbours[b].get(a) ?? 0) + edge.weight);
  }
  // Weights are added up in this order later. Floating point sums depend on their order, so a
  // fixed one keeps the result independent of the order the edges arrived in.
  return {
    adjacency: neighbours.map((map) => new Map([...map].sort(([a], [b]) => a - b))),
    selfLoops: services.map(() => 0),
  };
}

/**
 * Checks an edge is one community detection can use, and returns the indexes of its services.
 *
 * Edges should reach this function already clean: `getCallGraphEdges` drops calls to the service itself
 * and pairs with no calls, and callers keep only the edges between the services they group with
 * `edgesBetween`. A bad edge here means a caller has a bug, not that the data is unusual.
 *
 * Such an edge wouldn't fail on its own. One to a service not being grouped gives `NaN` gains, one
 * from a service to itself counts it as its own neighbour, and one with no weight joins services
 * that never call each other into the same connected group. In the end, each would silently give wrong groups,
 * so this throws instead, to make the bug loud: grouping fails and the map shows ungrouped.
 */
function extractAndValidateEdgeServices({
  edge: { source, target, weight },
  indexOf,
}: {
  edge: WeightedEdge;
  indexOf: ReadonlyMap<string, number>;
}): { a: number; b: number } {
  const a = indexOf.get(source);
  const b = indexOf.get(target);
  if (a === undefined || b === undefined) {
    throw new Error(`Edge ${source} - ${target} has a service that isn't being grouped`);
  }
  if (a === b) {
    throw new Error(`Edge ${source} - ${target} connects a service to itself`);
  }
  if (!(weight > 0)) {
    throw new Error(`Edge ${source} - ${target} has weight ${weight}, not a positive number`);
  }
  return { a, b };
}

function totalWeight(level: Level): number {
  let sum = 0;
  level.adjacency.forEach((neighbours, node) => {
    for (const weight of neighbours.values()) {
      sum += weight;
    }
    sum += 2 * level.selfLoops[node];
  });
  return sum / 2;
}

function degrees(level: Level): number[] {
  return level.adjacency.map((neighbours, node) => {
    let degree = 2 * level.selfLoops[node];
    for (const weight of neighbours.values()) {
      degree += weight;
    }
    return degree;
  });
}

/**
 * Moves nodes between communities while modularity improves, starting from each node alone or
 * from the given communities. Returns each node's community.
 */
function moveNodes({
  level,
  resolution,
  initial,
}: {
  level: Level;
  resolution: number;
  initial?: number[];
}): number[] {
  const nodeCount = level.adjacency.length;
  const community = initial ? [...initial] : Array.from({ length: nodeCount }, (_, node) => node);
  const doubleTotal = 2 * totalWeight(level);
  if (doubleTotal === 0) {
    return community;
  }
  const degree = degrees(level);
  const communityCount = community.reduce((max, id) => Math.max(max, id + 1), nodeCount);
  const communityDegree = new Array<number>(communityCount).fill(0);
  community.forEach((id, node) => (communityDegree[id] += degree[node]));

  for (let pass = 0; pass < COMMUNITY_DETECTION_MAX_PASSES; pass++) {
    let moved = false;
    for (let node = 0; node < nodeCount; node++) {
      const current = community[node];
      const toCommunity = new Map<number, number>();
      for (const [neighbour, weight] of level.adjacency[node]) {
        const id = community[neighbour];
        toCommunity.set(id, (toCommunity.get(id) ?? 0) + weight);
      }
      communityDegree[current] -= degree[node];
      const gain = (id: number) =>
        (toCommunity.get(id) ?? 0) -
        (resolution * degree[node] * communityDegree[id]) / doubleTotal;
      let best = current;
      let bestGain = gain(current);
      // ascending ids, so ties go to the lowest whatever order the neighbours came in
      for (const candidate of [...toCommunity.keys()].sort((a, b) => a - b)) {
        const candidateGain = gain(candidate);
        if (candidateGain > bestGain + COMMUNITY_DETECTION_GAIN_TOLERANCE) {
          best = candidate;
          bestGain = candidateGain;
        }
      }
      communityDegree[best] += degree[node];
      if (best !== current) {
        community[node] = best;
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
  }
  return community;
}

/** Collapses each community into one node of the next level. */
function aggregate({ level, community }: { level: Level; community: number[] }): {
  next: Level;
  index: number[];
} {
  const ids = [...new Set(community)].sort((a, b) => a - b);
  const indexOf = new Map(ids.map((id, index) => [id, index]));
  const index = community.map((id) => indexOf.get(id) ?? 0);
  const adjacency = ids.map(() => new Map<number, number>());
  const selfLoops = ids.map(() => 0);
  level.adjacency.forEach((neighbours, node) => {
    const a = index[node];
    selfLoops[a] += level.selfLoops[node];
    for (const [neighbour, weight] of neighbours) {
      const b = index[neighbour];
      if (a === b) {
        // each edge inside the community is seen from both of its ends
        selfLoops[a] += weight / 2;
      } else {
        adjacency[a].set(b, (adjacency[a].get(b) ?? 0) + weight);
      }
    }
  });
  return { next: { adjacency, selfLoops }, index };
}

/**
 * Splits each community into its connected pieces. Pieces are numbered in the order of their
 * first node, so by their first service's name.
 */
function splitDisconnected({
  adjacency,
  membership,
}: {
  adjacency: Array<Map<number, number>>;
  membership: number[];
}): number[] {
  const piece = new Array<number>(adjacency.length).fill(-1);
  let nextPiece = 0;
  for (let start = 0; start < adjacency.length; start++) {
    if (piece[start] !== -1) {
      continue;
    }
    const id = nextPiece++;
    piece[start] = id;
    const queue = [start];
    for (let position = 0; position < queue.length; position++) {
      for (const neighbour of adjacency[queue[position]].keys()) {
        if (piece[neighbour] === -1 && membership[neighbour] === membership[start]) {
          piece[neighbour] = id;
          queue.push(neighbour);
        }
      }
    }
  }
  return piece;
}
