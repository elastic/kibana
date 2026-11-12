/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { absorbTinyGroups } from './absorb_tiny_groups';
import {
  INFERENCE_RESOLUTIONS,
  MAX_GROUP_SIZE,
  MAX_SPLIT_DEPTH,
  MAX_TINY_PART_SHARE,
  READABLE_MAX_GROUPS,
  READABLE_MAX_LARGEST_GROUP_SHARE,
  READABLE_MIN_GROUPS,
  SELF_CONTAINED_CALL_SHARE,
  SELF_CONTAINED_GROUP_SHARE,
  SPLIT_RESOLUTIONS,
  TINY_GROUP_MAX_SIZE,
  TINY_PART_MAX_SIZE,
} from './constants';
import { detectCommunities } from './detect_communities';
import type { WeightedEdge } from './types';
import { edgesBetween } from './utils';

interface Run {
  groups: Map<string, number>;
  groupCount: number;
  largest: number;
  modularity: number;
  /** Share of groups of 3 or more that keep most of their calls inside. */
  selfContained: number;
  /** Share of services in groups of 3 or fewer. */
  inTinyParts: number;
}

/**
 * A group number for every service, from the calls between them. Expects the services that are
 * neither shared nor not connected, and the edges between them: those two are groups of their own,
 * and counting them here would skew which resolution reads best.
 *
 * Runs community detection at several resolutions and picks, in order: the finest readable run
 * whose groups are mostly self-contained, splitting a real team breaks that; the readable run the
 * calls fit best; the run the calls fit best with no group too large; the run with the smallest
 * largest group. Runs that break most services into tiny parts are never picked. Groups still too
 * large are then split on their own calls.
 *
 * The same calls always give the same groups, but a small change in the calls can move services
 * between groups, or change which resolution is picked. Keeping groups steady as calls change is
 * left for a later issue.
 */
export function inferGroupsFromCalls({
  services,
  edges,
}: {
  services: readonly string[];
  edges: readonly WeightedEdge[];
}): Map<string, number> {
  if (services.length === 0) {
    return new Map();
  }
  const runs = INFERENCE_RESOLUTIONS.map((resolution) =>
    measureRun({
      groups: absorbTinyGroups({
        groups: detectCommunities({ services, edges, resolution }),
        edges,
      }),
      edges,
    })
  );

  const picked = pickRun({ runs, serviceCount: services.length });
  return splitLargeGroups({ groups: picked.groups, edges });
}

/** Picks one run, from runs ordered from the coarsest resolution to the finest. */
function pickRun({ runs, serviceCount }: { runs: readonly Run[]; serviceCount: number }): Run {
  const eligible = runs.filter(({ inTinyParts }) => inTinyParts <= MAX_TINY_PART_SHARE);
  if (eligible.length === 0) {
    // Every resolution broke the services into fragments: the coarsest is the least broken
    return runs[0];
  }
  const byModularity = (a: Run, b: Run) => b.modularity - a.modularity;

  const readable = eligible.filter(
    ({ groupCount, largest }) =>
      groupCount >= READABLE_MIN_GROUPS &&
      groupCount <= READABLE_MAX_GROUPS &&
      largest <= MAX_GROUP_SIZE &&
      largest <= READABLE_MAX_LARGEST_GROUP_SHARE * serviceCount
  );

  // The finest readable run whose groups are mostly self-contained: splitting a real team breaks it
  const finestSelfContained = [...readable]
    .reverse()
    .find(({ selfContained }) => selfContained >= SELF_CONTAINED_GROUP_SHARE);
  if (finestSelfContained) {
    return finestSelfContained;
  }

  // The readable run the calls fit best. Self-containment would favour the coarsest run, since
  // larger groups keep more calls inside almost by default; modularity discounts what chance gives.
  const [bestReadable] = [...readable].sort(byModularity);
  if (bestReadable) {
    return bestReadable;
  }

  // A large estate can have more groups than read well at once: the run the calls fit best with no
  // group too large
  const [bestSmallEnough] = eligible
    .filter(({ largest }) => largest <= MAX_GROUP_SIZE)
    .sort(byModularity);
  if (bestSmallEnough) {
    return bestSmallEnough;
  }

  // Every eligible run has a group too large: the one whose largest group is smallest
  const [smallestLargest] = [...eligible].sort(
    (a, b) => a.largest - b.largest || byModularity(a, b)
  );
  return smallestLargest;
}

function measureRun({
  groups,
  edges,
}: {
  groups: Map<string, number>;
  edges: readonly WeightedEdge[];
}): Run {
  const sizes = groupSizes(groups);
  return {
    groups,
    groupCount: sizes.size,
    largest: maxOf(sizes.values()),
    modularity: modularityOf({ groups, edges }),
    selfContained: selfContainedShare({ groups, edges }),
    inTinyParts: tinyPartShare(groups),
  };
}

function groupSizes(groups: ReadonlyMap<string, number>): Map<number, number> {
  const sizes = new Map<number, number>();
  for (const group of groups.values()) {
    sizes.set(group, (sizes.get(group) ?? 0) + 1);
  }
  return sizes;
}

/** Each group's services, by group number. */
function membersByGroup(groups: ReadonlyMap<string, number>): string[][] {
  const members = new Map<number, string[]>();
  for (const [service, group] of groups) {
    const list = members.get(group) ?? [];
    list.push(service);
    members.set(group, list);
  }
  return [...members].sort(([a], [b]) => a - b).map(([, list]) => list);
}

/** The largest of non-negative numbers, 0 for none. Safe on lists too long to spread. */
function maxOf(values: Iterable<number>): number {
  let max = 0;
  for (const value of values) {
    max = Math.max(max, value);
  }
  return max;
}

function tinyPartShare(groups: ReadonlyMap<string, number>): number {
  if (groups.size === 0) {
    return 0;
  }
  let inTiny = 0;
  for (const size of groupSizes(groups).values()) {
    if (size <= TINY_PART_MAX_SIZE) {
      inTiny += size;
    }
  }
  return inTiny / groups.size;
}

/** Newman modularity at resolution 1: how much more weight stays inside groups than chance gives. */
function modularityOf({
  groups,
  edges,
}: {
  groups: ReadonlyMap<string, number>;
  edges: readonly WeightedEdge[];
}): number {
  let total = 0;
  let inside = 0;
  const groupDegree = new Map<number, number>();
  for (const { source, target, weight } of edges) {
    const a = groups.get(source);
    const b = groups.get(target);
    if (a === undefined || b === undefined) {
      continue;
    }
    total += weight;
    if (a === b) {
      inside += weight;
    }
    groupDegree.set(a, (groupDegree.get(a) ?? 0) + weight);
    groupDegree.set(b, (groupDegree.get(b) ?? 0) + weight);
  }
  if (total === 0) {
    return 0;
  }
  let expected = 0;
  for (const degree of groupDegree.values()) {
    expected += (degree / (2 * total)) ** 2;
  }
  return inside / total - expected;
}

/** Share of groups of 3 or more whose calls mostly stay inside them. */
function selfContainedShare({
  groups,
  edges,
}: {
  groups: ReadonlyMap<string, number>;
  edges: readonly WeightedEdge[];
}): number {
  const inside = new Map<number, number>();
  const touching = new Map<number, number>();
  for (const { source, target, weight } of edges) {
    const a = groups.get(source);
    const b = groups.get(target);
    if (a === undefined || b === undefined) {
      continue;
    }
    touching.set(a, (touching.get(a) ?? 0) + weight);
    if (a === b) {
      inside.set(a, (inside.get(a) ?? 0) + weight);
    } else {
      touching.set(b, (touching.get(b) ?? 0) + weight);
    }
  }
  const large = [...groupSizes(groups)]
    .filter(([, size]) => size > TINY_GROUP_MAX_SIZE)
    .map(([group]) => group);
  if (large.length === 0) {
    return 0;
  }
  const contained = large.filter(
    (group) => (inside.get(group) ?? 0) / (touching.get(group) || 1) >= SELF_CONTAINED_CALL_SHARE
  );
  return contained.length / large.length;
}

/**
 * Splits each group above the size limit on its own calls, finer and finer, so a tightly knit
 * team of hundreds of services still reads as a few groups. Best effort: a split that breaks most
 * of the group into tiny parts is rejected, and a group no split suits stays whole, even above
 * the limit. A large group reads better than fragments.
 */
function splitLargeGroups({
  groups,
  edges,
}: {
  groups: ReadonlyMap<string, number>;
  edges: readonly WeightedEdge[];
}): Map<string, number> {
  const result = new Map(groups);
  let nextGroup = maxOf(groups.values()) + 1;

  const split = (members: string[], depth: number) => {
    if (members.length <= MAX_GROUP_SIZE || depth >= MAX_SPLIT_DEPTH) {
      return;
    }
    const inside = edgesBetween({ edges, services: new Set(members) });
    let pieces: string[][] | undefined;
    let smallestLargest = Infinity;
    for (const resolution of SPLIT_RESOLUTIONS) {
      const parts = absorbTinyGroups({
        groups: detectCommunities({ services: members, edges: inside, resolution }),
        edges: inside,
      });
      const partMembers = membersByGroup(parts);
      if (partMembers.length < 2 || tinyPartShare(parts) > MAX_TINY_PART_SHARE) {
        continue;
      }
      const largest = maxOf(partMembers.map((part) => part.length));
      if (largest < smallestLargest) {
        smallestLargest = largest;
        pieces = partMembers;
      }
      if (largest <= MAX_GROUP_SIZE) {
        break;
      }
    }
    if (!pieces) {
      return;
    }
    // the first piece keeps the group's number
    for (const piece of pieces.slice(1)) {
      const group = nextGroup++;
      piece.forEach((service) => result.set(service, group));
    }
    pieces.forEach((piece) => split(piece, depth + 1));
  };

  membersByGroup(groups).forEach((members) => split(members, 0));
  return result;
}
