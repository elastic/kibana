/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapGroup } from '@kbn/apm-types';
import { groupServicesByCalls } from './group_services_by_calls';
import {
  adjustedRandIndex,
  isConnected,
  seededRandom,
  shuffled,
  syntheticEstate,
} from './test_helpers';
import type { SyntheticEstate } from './test_helpers';
import type { ServiceCallStats } from './types';

function group(estate: SyntheticEstate) {
  const { services, edges, stats } = estate;
  const strategy = groupServicesByCalls({ services, edges, stats });
  const groupOf = new Map<string, ServiceMapGroup>(
    services.map((service, index) => [service, strategy.groups[strategy.assignment[index]]])
  );
  return { strategy, groupOf };
}

function groupIds(groupOf: ReadonlyMap<string, ServiceMapGroup>): Map<string, string> {
  return new Map([...groupOf].map(([service, { id }]) => [service, id]));
}

const teamServices = ({ services, teamOf }: SyntheticEstate) =>
  services.filter((service) => teamOf.get(service)?.startsWith('team-'));

/** `count` teams of `size` services, named `team<team>-<member>`. */
const namedTeams = (count: number, size: number): string[][] =>
  Array.from({ length: count }, (_, team) =>
    Array.from({ length: size }, (__, member) => `team${team}-${member}`)
  );

/**
 * Each member calls 4 others of its team at random, and each team's first member calls the next
 * team's. Random calls don't break a team into self-contained parts, as a ring of calls would.
 */
function randomlyWiredCalls(teams: string[][]): Array<readonly [string, string]> {
  const random = seededRandom(1);
  return teams.flatMap((members, team) => [
    ...members.flatMap((caller, position) =>
      Array.from({ length: 4 }, () => {
        const picked = Math.floor(random() * members.length);
        const callee = members[picked === position ? (picked + 1) % members.length : picked];
        return [caller, callee] as const;
      })
    ),
    ...(teams.length > 1 ? [[members[0], teams[(team + 1) % teams.length][0]] as const] : []),
  ]);
}

/** Groups teams wired at random, next to services with no calls. */
function groupRandomlyWiredTeams({ teams, idle }: { teams: string[][]; idle: number }) {
  return group(
    syntheticEstate({
      teams: 0,
      servicesPerTeam: 0,
      extraServices: [
        ...teams.flat(),
        ...Array.from({ length: idle }, (_, index) => `idle-${index}`),
      ],
      extraCalls: randomlyWiredCalls(teams),
    })
  );
}

function expectEachTeamInOneCallsGroup({
  teams,
  groupOf,
}: {
  teams: string[][];
  groupOf: ReadonlyMap<string, ServiceMapGroup>;
}) {
  for (const members of teams) {
    const groupsOfTeam = new Set(members.map((service) => groupOf.get(service)));
    expect(groupsOfTeam.size).toBe(1);
    expect([...groupsOfTeam][0]?.kind).toBe('calls');
  }
}

describe('groupServicesByCalls', () => {
  it('puts the services every team calls in the shared group, and still finds the teams', () => {
    const estate = syntheticEstate({ teams: 30, servicesPerTeam: 20, sharedServices: 4, seed: 5 });
    const { groupOf } = group(estate);

    for (const service of estate.shared) {
      expect(groupOf.get(service)).toEqual({ id: 'shared', kind: 'shared' });
    }
    expect(
      adjustedRandIndex({
        services: teamServices(estate),
        truth: estate.teamOf,
        found: groupIds(groupOf),
      })
    ).toBeGreaterThan(0.9);
  });

  it('puts a gateway in the shared group alongside the services every team calls', () => {
    const estate = syntheticEstate({
      teams: 30,
      servicesPerTeam: 20,
      sharedServices: 3,
      seed: 5,
      namedByTeam: true,
      extraServices: ['gateway'],
      extraCalls: Array.from({ length: 30 }, (_, team) => ['gateway', `t${team}-s0`] as const),
    });
    const { groupOf } = group(estate);

    for (const service of [...estate.shared, 'gateway']) {
      expect(groupOf.get(service)?.kind).toBe('shared');
    }
  });

  it('puts a gateway that calls into every team in the shared group, and still finds the teams', () => {
    const estate = syntheticEstate({
      teams: 30,
      servicesPerTeam: 20,
      seed: 5,
      namedByTeam: true,
      extraServices: ['gateway'],
      extraCalls: Array.from({ length: 30 }, (_, team) => ['gateway', `t${team}-s0`] as const),
    });
    const { groupOf } = group(estate);

    expect(groupOf.get('gateway')?.kind).toBe('shared');
    expect(
      adjustedRandIndex({
        services: teamServices(estate),
        truth: estate.teamOf,
        found: groupIds(groupOf),
      })
    ).toBeGreaterThan(0.9);
  });

  it('puts services with no calls, and a pair cut off from the rest, in one not connected group', () => {
    const extra = ['idle-1', 'idle-2', 'pair-a', 'pair-b'];
    const estate = syntheticEstate({
      teams: 30,
      servicesPerTeam: 20,
      sharedServices: 4,
      seed: 5,
      extraServices: extra,
      extraCalls: [['pair-a', 'pair-b']],
    });
    const { groupOf } = group(estate);

    for (const service of extra) {
      expect(groupOf.get(service)).toEqual({ id: 'notConnected', kind: 'notConnected' });
    }
    expect(teamServices(estate).some((service) => groupOf.get(service)?.kind !== 'calls')).toBe(
      false
    );
  });

  it('puts a service that only calls shared services in the not connected group', () => {
    const estate = syntheticEstate({
      teams: 30,
      servicesPerTeam: 20,
      sharedServices: 4,
      seed: 5,
      extraServices: ['batch-job'],
      extraCalls: [['batch-job', 'shared-0']],
    });
    const { groupOf } = group(estate);

    expect(groupOf.get('shared-0')?.kind).toBe('shared');
    expect(groupOf.get('batch-job')).toEqual({ id: 'notConnected', kind: 'notConnected' });
  });

  it('groups each team of a gateway in front of its own backends, sharing none of the gateways', () => {
    // 50 teams of 10, each a gateway calling its 9 backends
    // and the gateways of the next team and of the team 3 further on
    const teams = Array.from({ length: 50 }, (_, team) =>
      Array.from({ length: 10 }, (__, member) => `team${team}-${member === 0 ? 'gateway' : member}`)
    );
    const estate = syntheticEstate({
      teams: 0,
      servicesPerTeam: 0,
      extraServices: teams.flat(),
      extraCalls: teams.flatMap(([gateway, ...backends], team) => [
        ...backends.map((backend) => [gateway, backend] as const),
        [gateway, teams[(team + 1) % teams.length][0]] as const,
        [gateway, teams[(team + 3) % teams.length][0]] as const,
      ]),
    });
    const { strategy, groupOf } = group(estate);

    expect(new Set(strategy.groups.map(({ kind }) => kind))).toEqual(new Set(['calls']));
    for (const members of teams) {
      // team<n>-gateway names the group, team<n>-1 is first by name
      const [gateway, firstByName] = members;
      expect(new Set(members.map((service) => groupOf.get(service)))).toEqual(
        new Set([{ id: `calls:${firstByName}`, kind: 'calls', busiestService: gateway }])
      );
    }
  });

  it('keeps a team whole when it is above 40% of the services grouped by calls, but not of the map', () => {
    // A team of 50 next to 6 teams of 10, and 30 services with no calls: the team is 45% of the
    // 110 services grouped by calls, but 36% of the 140 on the map.
    const teams = [
      Array.from({ length: 50 }, (_, member) => `big-${member}`),
      ...namedTeams(6, 10),
    ];
    const { groupOf } = groupRandomlyWiredTeams({ teams, idle: 30 });

    expectEachTeamInOneCallsGroup({ teams, groupOf });
  });

  it('groups a map of a few teams as those teams', () => {
    // 4 teams of 30, each a quarter of the map
    const teams = namedTeams(4, 30);
    const { strategy, groupOf } = groupRandomlyWiredTeams({ teams, idle: 0 });

    expectEachTeamInOneCallsGroup({ teams, groupOf });
    expect(strategy.groups).toHaveLength(4);
  });

  it('keeps the only team whole when most of the map has no calls', () => {
    // a team of 40 and 70 services with no calls: the team is 36% of the map
    const teams = namedTeams(1, 40);
    const { strategy, groupOf } = groupRandomlyWiredTeams({ teams, idle: 70 });

    expectEachTeamInOneCallsGroup({ teams, groupOf });
    expect(strategy.groups.map(({ kind }) => kind).sort()).toEqual(['calls', 'notConnected']);
  });

  it('has no shared or not connected group when no service is either', () => {
    const { strategy } = group(syntheticEstate({ teams: 30, servicesPerTeam: 20, seed: 5 }));

    expect(new Set(strategy.groups.map(({ kind }) => kind))).toEqual(new Set(['calls']));
  });

  /**
   * A clique of 4 on a map of 100: each member is called by 3, under a quarter of the map, and has
   * too few neighbours to be shared, so the clique is grouped as one. The rest have no calls.
   */
  function cliqueOnMapOf100(traffic: Record<'a' | 'b' | 'c' | 'd', number>) {
    const idle = Array.from({ length: 96 }, (_, index) => `idle-${index}`);
    const clique = ['a', 'b', 'c', 'd'] as const;
    return {
      idle,
      services: [...clique, ...idle],
      edges: clique.flatMap((source, index) =>
        clique.slice(index + 1).map((target) => ({ source, target, weight: 1 }))
      ),
      stats: new Map<string, ServiceCallStats>([
        ...clique.map((service): [string, ServiceCallStats] => [
          service,
          { callers: 3, neighbours: 3, traffic: traffic[service] },
        ]),
        ...idle.map((service): [string, ServiceCallStats] => [
          service,
          { callers: 0, neighbours: 0, traffic: 0 },
        ]),
      ]),
    };
  }

  it('ids each group found from calls by its first service by name, and names it after its busiest, ties broken by name', () => {
    const clique = cliqueOnMapOf100({ a: 1, b: 5, c: 5, d: 2 });

    expect(groupServicesByCalls(clique)).toEqual({
      source: 'calls',
      groups: [
        { id: 'calls:a', kind: 'calls', busiestService: 'b' },
        { id: 'notConnected', kind: 'notConnected' },
      ],
      assignment: [0, 0, 0, 0, ...clique.idle.map(() => 1)],
    });
  });

  it('keeps the id of a group whose members stay the same when another becomes the busiest', () => {
    const before = cliqueOnMapOf100({ a: 1, b: 5, c: 5, d: 2 });
    const after = cliqueOnMapOf100({ a: 1, b: 5, c: 5, d: 9 });

    const [groupBefore] = groupServicesByCalls(before).groups;
    const [groupAfter] = groupServicesByCalls(after).groups;

    expect(groupBefore).toEqual({ id: 'calls:a', kind: 'calls', busiestService: 'b' });
    expect(groupAfter).toEqual({ id: 'calls:a', kind: 'calls', busiestService: 'd' });
  });

  it('names every group found from calls after its member with the most calls', () => {
    const estate = syntheticEstate({ teams: 30, servicesPerTeam: 20, sharedServices: 4, seed: 5 });
    const { strategy } = group(estate);

    strategy.groups.forEach((candidate, index) => {
      if (candidate.kind !== 'calls') {
        return;
      }
      const members = estate.services.filter(
        (_, position) => strategy.assignment[position] === index
      );
      const mostCalls = Math.max(
        ...members.map((member) => estate.stats.get(member)?.traffic ?? 0)
      );
      expect(estate.stats.get(candidate.busiestService)?.traffic).toBe(mostCalls);
      expect(members).toContain(candidate.busiestService);
    });
  });

  it('assigns every service a group, listing groups in the order their first service appears', () => {
    const estate = syntheticEstate({
      teams: 30,
      servicesPerTeam: 20,
      sharedServices: 4,
      seed: 5,
      extraServices: ['idle'],
    });
    const { strategy } = group(estate);

    expect(strategy.assignment).toHaveLength(estate.services.length);
    let highest = -1;
    for (const index of strategy.assignment) {
      expect(index).toBeLessThanOrEqual(highest + 1);
      highest = Math.max(highest, index);
    }
    expect(highest).toBe(strategy.groups.length - 1);
  });

  it('keeps every group found from calls connected', () => {
    const estate = syntheticEstate({ teams: 12, servicesPerTeam: 220, sharedServices: 4, seed: 3 });
    const { strategy } = group(estate);

    strategy.groups.forEach(({ kind }, index) => {
      if (kind !== 'calls') {
        return;
      }
      const members = estate.services.filter(
        (_, position) => strategy.assignment[position] === index
      );
      expect(isConnected(members, estate.edges)).toBe(true);
    });
  });

  it('gives the same groups whatever order the edges arrive in', () => {
    const estate = syntheticEstate({ teams: 30, servicesPerTeam: 20, sharedServices: 4, seed: 5 });
    const { strategy } = group(estate);

    expect(
      groupServicesByCalls({
        services: estate.services,
        edges: shuffled(estate.edges, 1),
        stats: estate.stats,
      })
    ).toEqual(strategy);
  });
});
