/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_GROUP_SIZE } from './constants';
import { inferGroupsFromCalls } from './infer_groups_from_calls';
import { adjustedRandIndex, seededRandom, syntheticEstate } from './test_helpers';
import type { WeightedEdge } from './types';

function membersByGroup(groups: ReadonlyMap<string, number>): string[][] {
  const members = new Map<number, string[]>();
  for (const [service, group] of groups) {
    members.set(group, [...(members.get(group) ?? []), service]);
  }
  return [...members.values()];
}

function isConnected(members: readonly string[], edges: readonly WeightedEdge[]): boolean {
  const inGroup = new Set(members);
  const neighbours = new Map<string, string[]>();
  for (const { source, target } of edges) {
    if (inGroup.has(source) && inGroup.has(target)) {
      neighbours.set(source, [...(neighbours.get(source) ?? []), target]);
      neighbours.set(target, [...(neighbours.get(target) ?? []), source]);
    }
  }
  const reached = new Set([members[0]]);
  const queue = [members[0]];
  for (let position = 0; position < queue.length; position++) {
    for (const next of neighbours.get(queue[position]) ?? []) {
      if (!reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  return reached.size === members.length;
}

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const random = seededRandom(seed);
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function star(leaves: number): { services: string[]; edges: WeightedEdge[] } {
  const services = ['hub', ...Array.from({ length: leaves }, (_, index) => `leaf-${index}`)];
  return {
    services,
    edges: services.slice(1).map((leaf) => ({ source: 'hub', target: leaf, weight: 1 })),
  };
}

function clique(size: number): { services: string[]; edges: WeightedEdge[] } {
  const services = Array.from({ length: size }, (_, index) => `svc-${index}`);
  const edges: WeightedEdge[] = [];
  services.forEach((source, index) =>
    services.slice(index + 1).forEach((target) => edges.push({ source, target, weight: 1 }))
  );
  return { services, edges };
}

describe('inferGroupsFromCalls', () => {
  it('recovers the teams planted in an estate', () => {
    const { services, edges, teamOf } = syntheticEstate({
      teams: 30,
      servicesPerTeam: 20,
      seed: 5,
    });
    const groups = inferGroupsFromCalls({ services, edges });

    expect(adjustedRandIndex({ services, truth: teamOf, found: groups })).toBeGreaterThan(0.9);
  });

  it(`splits teams too large to read, so no group has more than ${MAX_GROUP_SIZE} services`, () => {
    const { services, edges } = syntheticEstate({ teams: 12, servicesPerTeam: 220, seed: 3 });
    const groups = inferGroupsFromCalls({ services, edges });

    const sizes = membersByGroup(groups).map((members) => members.length);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(MAX_GROUP_SIZE);
  });

  it.each([
    { teams: 30, servicesPerTeam: 20, seed: 5 },
    { teams: 12, servicesPerTeam: 220, seed: 3 },
    { teams: 34, servicesPerTeam: 25, seed: 7 },
  ])(
    'keeps every group connected: $teams teams of $servicesPerTeam',
    ({ teams, servicesPerTeam, seed }) => {
      const { services, edges } = syntheticEstate({ teams, servicesPerTeam, seed });
      const groups = inferGroupsFromCalls({ services, edges });

      for (const members of membersByGroup(groups)) {
        expect(isConnected(members, edges)).toBe(true);
      }
    }
  );

  it('gives the same groups whatever order services and edges arrive in', () => {
    const { services, edges } = syntheticEstate({ teams: 12, servicesPerTeam: 220, seed: 3 });
    const first = inferGroupsFromCalls({ services, edges });

    expect(
      inferGroupsFromCalls({ services: shuffled(services, 1), edges: shuffled(edges, 2) })
    ).toEqual(first);
  });

  // Artificially extreme shapes, to check how the edge case is handled: every resolution either
  // keeps them whole or breaks them into single services, and fragments read worse than one large
  // group. Real estates have structure to split on, and a hub like this star's would be shared
  // before inference. Keeping one group above the limit is the exception, not normal behaviour.
  it.each([
    { shape: 'a star of 300 leaves', ...star(300) },
    { shape: 'a clique of 200', ...clique(200) },
  ])(
    `keeps $shape as one group above ${MAX_GROUP_SIZE}, rather than breaking it into fragments`,
    ({ services, edges }) => {
      const groups = inferGroupsFromCalls({ services, edges });

      expect(new Set(groups.values()).size).toBe(1);
    }
  );

  it('falls back on the coarsest run when every run breaks most services into tiny parts', () => {
    // A chain of 12 is one group at the coarsest resolution and several at finer ones. As many
    // services with no calls, each a group of one in every run, put half the services in tiny
    // parts whatever the resolution, so no run is eligible.
    const chain = Array.from(
      { length: 12 },
      (_, index) => `chain-${String(index).padStart(2, '0')}`
    );
    const idle = Array.from({ length: 12 }, (_, index) => `idle-${index}`);
    const edges = chain
      .slice(1)
      .map((target, index) => ({ source: chain[index], target, weight: 1 }));

    const groups = inferGroupsFromCalls({ services: [...chain, ...idle], edges });

    expect(new Set(chain.map((service) => groups.get(service))).size).toBe(1);
    expect(new Set(idle.map((service) => groups.get(service))).size).toBe(idle.length);
    expect(idle.map((service) => groups.get(service))).not.toContain(groups.get(chain[0]));
  });

  it('groups nothing when given no services', () => {
    expect(inferGroupsFromCalls({ services: [], edges: [] })).toEqual(new Map());
  });
});
