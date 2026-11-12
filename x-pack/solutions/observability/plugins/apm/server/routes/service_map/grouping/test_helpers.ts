/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Test helpers for grouping: synthetic estates whose teams are known, and grading against them. */

import type { MatchedServiceCallGraph } from './match_service_call_graph';
import type { WeightedEdge } from './types';
import { compareNames } from './utils';
import { recordByService } from '../record_by_service';

/** A small seeded generator, so a synthetic estate is the same on every run. */
export function seededRandom(seed: number): () => number {
  let state = Math.abs(Math.floor(seed)) % 2 ** 32 || 1;
  return () => {
    // a linear congruential generator; the product stays below 2^53, so it is exact
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

export interface SyntheticEstate {
  services: string[];
  /** Each service's calls, directed and counted, as matching gives them. */
  callGraph: MatchedServiceCallGraph;
  /**
   * The same calls as `getCallGraphEdges` would give them: one edge per pair, weighing
   * `log(1 + calls)`. Built here, so tests of later steps don't depend on the edge builder.
   */
  edges: WeightedEdge[];
  /** The team that owns each service: the grouping a good method should recover. */
  teamOf: Map<string, string>;
  /** Services every team calls. */
  shared: string[];
}

/**
 * Teams of services that mostly call each other, plus shared services (auth, a gateway's
 * backends) that every team calls. Each call adds one to the count of its caller and callee.
 */
export function syntheticEstate({
  teams,
  servicesPerTeam,
  localShare = 0.85,
  callsPerService = 3,
  sharedServices = 0,
  seed = 1,
  namedByTeam = false,
}: {
  teams: number;
  servicesPerTeam: number;
  /** Share of each service's calls that go to its own team. */
  localShare?: number;
  callsPerService?: number;
  sharedServices?: number;
  seed?: number;
  /** Name services after their team (`t3-s1`), else with a neutral name (`svc-0417`). */
  namedByTeam?: boolean;
}): SyntheticEstate {
  const random = seededRandom(seed);
  const teamOf = new Map<string, string>();
  const byTeam: string[][] = [];
  for (let team = 0; team < teams; team++) {
    const members: string[] = [];
    for (let member = 0; member < servicesPerTeam; member++) {
      const service = namedByTeam
        ? `t${team}-s${member}`
        : `svc-${String(((team * servicesPerTeam + member) * 7919) % 9973).padStart(4, '0')}`;
      teamOf.set(service, `team-${team}`);
      members.push(service);
    }
    byTeam.push(members);
  }
  const shared = Array.from({ length: sharedServices }, (_, index) => `shared-${index}`);
  shared.forEach((service) => teamOf.set(service, 'shared'));

  const counts = new Map<string, Map<string, number>>();
  // calls between each pair, both ways, under the name that sorts first
  const pairs = new Map<string, Map<string, number>>();
  const call = (caller: string, callee: string) => {
    const callees = counts.get(caller) ?? new Map<string, number>();
    callees.set(callee, (callees.get(callee) ?? 0) + 1);
    counts.set(caller, callees);

    const [source, target] = compareNames(caller, callee) < 0 ? [caller, callee] : [callee, caller];
    const targets = pairs.get(source) ?? new Map<string, number>();
    targets.set(target, (targets.get(target) ?? 0) + 1);
    pairs.set(source, targets);
  };
  byTeam.forEach((members, team) => {
    for (const caller of members) {
      for (let made = 0; made < callsPerService; made++) {
        const pool =
          random() < localShare
            ? members
            : byTeam[(team + 1 + Math.floor(random() * (teams - 1))) % teams];
        const callee = pool[Math.floor(random() * pool.length)];
        if (callee !== caller) {
          call(caller, callee);
        }
      }
      for (const hub of shared) {
        if (random() < 0.5) {
          call(caller, hub);
        }
      }
    }
  });

  return {
    services: [...teamOf.keys()],
    callGraph: recordByService(
      [...counts].map(([caller, callees]) => [
        caller,
        [...callees].map(([service, calls]) => ({ service, calls })),
      ])
    ),
    edges: [...pairs]
      .flatMap(([source, targets]) =>
        [...targets].map(([target, calls]) => ({ source, target, weight: Math.log1p(calls) }))
      )
      .sort((a, b) => compareNames(a.source, b.source) || compareNames(a.target, b.target)),
    teamOf,
    shared,
  };
}

/**
 * Agreement between two groupings: 1 for identical, around 0 for chance (Hubert and Arabie 1985).
 * Counts the pairs of services both groupings put together or apart.
 */
export function adjustedRandIndex<Truth, Found>({
  services,
  truth,
  found,
}: {
  services: readonly string[];
  truth: ReadonlyMap<string, Truth>;
  found: ReadonlyMap<string, Found>;
}): number {
  const choose2 = (count: number) => (count * (count - 1)) / 2;
  // services in each (expected group, found group) combination
  const table = new Map<Truth | undefined, Map<Found | undefined, number>>();
  const rows = new Map<Truth | undefined, number>();
  const columns = new Map<Found | undefined, number>();
  for (const service of services) {
    const expected = truth.get(service);
    const actual = found.get(service);
    const row = table.get(expected) ?? new Map<Found | undefined, number>();
    row.set(actual, (row.get(actual) ?? 0) + 1);
    table.set(expected, row);
    rows.set(expected, (rows.get(expected) ?? 0) + 1);
    columns.set(actual, (columns.get(actual) ?? 0) + 1);
  }
  const sum = (values: Iterable<number>) =>
    [...values].reduce((total, count) => total + choose2(count), 0);
  const index = sum([...table.values()].flatMap((row) => [...row.values()]));
  const rowSum = sum(rows.values());
  const columnSum = sum(columns.values());
  const expectedIndex = (rowSum * columnSum) / choose2(services.length);
  const maxIndex = (rowSum + columnSum) / 2;
  return maxIndex === expectedIndex ? 1 : (index - expectedIndex) / (maxIndex - expectedIndex);
}
