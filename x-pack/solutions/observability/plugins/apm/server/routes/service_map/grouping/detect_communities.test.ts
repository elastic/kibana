/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WeightedEdge } from './types';
import { detectCommunities } from './detect_communities';
import { adjustedRandIndex, seededRandom, syntheticEstate } from './test_helpers';

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const random = seededRandom(seed);
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

describe('detectCommunities', () => {
  it('finds two cliques joined by one call', () => {
    const edges: WeightedEdge[] = [
      { source: 'a', target: 'b', weight: 1 },
      { source: 'b', target: 'c', weight: 1 },
      { source: 'a', target: 'c', weight: 1 },
      { source: 'x', target: 'y', weight: 1 },
      { source: 'y', target: 'z', weight: 1 },
      { source: 'x', target: 'z', weight: 1 },
      { source: 'c', target: 'x', weight: 1 },
    ];
    const groups = detectCommunities({ services: ['a', 'b', 'c', 'x', 'y', 'z'], edges });

    expect(groups.get('a')).toBe(groups.get('b'));
    expect(groups.get('a')).toBe(groups.get('c'));
    expect(groups.get('x')).toBe(groups.get('y'));
    expect(groups.get('x')).toBe(groups.get('z'));
    expect(groups.get('a')).not.toBe(groups.get('x'));
  });

  it('gives the same groups whatever order services and edges arrive in', () => {
    const { services, edges } = syntheticEstate({ teams: 12, servicesPerTeam: 10, seed: 3 });
    const first = detectCommunities({ services, edges });
    const again = detectCommunities({
      services: shuffled(services, 1),
      edges: shuffled(edges, 2),
    });

    expect(again).toEqual(first);
  });

  it('gives the same groups whatever the order when weights are not whole numbers', () => {
    const estate = syntheticEstate({ teams: 12, servicesPerTeam: 10, seed: 4 });
    const random = seededRandom(5);
    // the log of call counts spread over several orders of magnitude
    const edges = estate.edges.map((edge) => ({
      ...edge,
      weight: Math.log1p(Math.floor(10 ** (random() * 6))),
    }));
    expect(edges.some(({ weight }) => !Number.isInteger(weight))).toBe(true);

    const { services } = estate;
    const first = detectCommunities({ services, edges });
    for (const seed of [6, 7, 8]) {
      expect(
        detectCommunities({
          services: shuffled(services, seed),
          edges: shuffled(edges, seed + 10),
        })
      ).toEqual(first);
    }
  });

  it('keeps every group connected, and a service with no calls alone', () => {
    const groups = detectCommunities({
      services: ['a', 'b', 'lonely'],
      edges: [{ source: 'a', target: 'b', weight: 1 }],
    });

    expect(groups.get('a')).toBe(groups.get('b'));
    expect(groups.get('lonely')).not.toBe(groups.get('a'));
  });

  it('numbers groups from 0 in the order of their first service by name', () => {
    const groups = detectCommunities({
      services: ['z', 'y', 'b', 'a'],
      edges: [
        { source: 'y', target: 'z', weight: 1 },
        { source: 'a', target: 'b', weight: 1 },
      ],
    });

    expect(groups).toEqual(
      new Map([
        ['a', 0],
        ['b', 0],
        ['y', 1],
        ['z', 1],
      ])
    );
  });

  it('checks its edges, throwing on one to a service that is not being grouped', () => {
    expect(() =>
      detectCommunities({
        services: ['a', 'b'],
        edges: [{ source: 'a', target: 'elsewhere', weight: 1 }],
      })
    ).toThrow('Edge a - elsewhere');
  });

  it.each([
    { teams: 20, servicesPerTeam: 15, localShare: 0.85, resolution: 1 },
    { teams: 8, servicesPerTeam: 40, localShare: 0.75, resolution: 1 },
    // sparse calls: at resolution 1 neighbouring teams merge, a higher resolution separates them
    { teams: 34, servicesPerTeam: 25, localShare: 0.8, resolution: 2 },
  ])(
    'recovers $teams teams of $servicesPerTeam services when $localShare of calls stay in the team',
    ({ teams, servicesPerTeam, localShare, resolution }) => {
      const { services, edges, teamOf } = syntheticEstate({
        teams,
        servicesPerTeam,
        localShare,
        seed: 7,
      });
      const groups = detectCommunities({ services, edges, resolution });

      expect(adjustedRandIndex({ services, truth: teamOf, found: groups })).toBeGreaterThan(0.8);
    }
  );

  it('finds fewer groups at a lower resolution', () => {
    const { services, edges } = syntheticEstate({ teams: 34, servicesPerTeam: 25, seed: 7 });
    const groupCount = (resolution: number) =>
      new Set(detectCommunities({ services, edges, resolution }).values()).size;

    expect(groupCount(0.5)).toBeLessThan(groupCount(2));
  });
});
