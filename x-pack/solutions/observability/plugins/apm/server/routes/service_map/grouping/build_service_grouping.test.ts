/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapGrouping } from '@kbn/apm-types';
import type { ServiceCallGraph } from '../get_service_call_graph';
import type { ServiceGroupingAttributes } from '../get_service_grouping_attributes';
import { buildServiceGrouping } from './build_service_grouping';
import { SERVICE_GROUPING_MIN_SERVICES } from './constants';
import { groupServicesByCalls } from './group_services_by_calls';
import type { SyntheticEstate } from './test_helpers';
import { syntheticEstate } from './test_helpers';
import { compareNames } from './utils';

/** The estate's calls as the call graph query returns them, destinations named after services. */
function callGraphOf(estate: SyntheticEstate): ServiceCallGraph {
  return Object.fromEntries(
    Object.entries(estate.callGraph).map(([caller, callees]) => [
      caller,
      callees.map(({ service, calls }) => ({ destination: service, calls })),
    ])
  );
}

/** The group of `service` in the strategy grouping by `source`. */
function groupOf(
  grouping: Omit<ServiceMapGrouping, 'services'> | undefined,
  services: readonly string[],
  source: string,
  service: string
) {
  const strategy = grouping?.strategies.find((candidate) => candidate.source === source);
  return strategy?.groups[strategy.assignment[services.indexOf(service)]];
}

const names = (count: number) =>
  Array.from({ length: count }, (_, index) => `svc-${String(index).padStart(3, '0')}`);

describe('buildServiceGrouping', () => {
  it(`leaves a map with fewer than ${SERVICE_GROUPING_MIN_SERVICES} services ungrouped`, () => {
    expect(
      buildServiceGrouping({
        callGraph: {},
        spans: [],
        services: names(SERVICE_GROUPING_MIN_SERVICES - 1),
      })
    ).toBeUndefined();
    expect(
      buildServiceGrouping({
        callGraph: {},
        spans: [],
        services: names(SERVICE_GROUPING_MIN_SERVICES),
      })
    ).toBeDefined();
  });

  it('puts every service in the not connected group when there are no calls between them', () => {
    const grouping = buildServiceGrouping({
      callGraph: {},
      spans: [],
      services: names(SERVICE_GROUPING_MIN_SERVICES),
    });

    expect(grouping?.strategies).toEqual([
      {
        source: 'calls',
        passes: true,
        groups: [{ id: 'notConnected', kind: 'notConnected' }],
        assignment: names(SERVICE_GROUPING_MIN_SERVICES).map(() => 0),
      },
    ]);
  });

  it('shows the grouping by calls automatically, passing, until strategies are scored', () => {
    const estate = syntheticEstate({ teams: 30, servicesPerTeam: 20, sharedServices: 4, seed: 5 });
    const callGraph = callGraphOf(estate);
    const services = [...estate.services].sort(compareNames);

    const grouping = buildServiceGrouping({
      callGraph,
      spans: [],
      services,
    });

    expect(grouping).toEqual({
      automatic: 'calls',
      strategies: [
        {
          ...groupServicesByCalls({ services, edges: estate.edges, stats: estate.stats }),
          passes: true,
        },
      ],
    });
  });

  describe('by service.namespace', () => {
    const estate = syntheticEstate({
      teams: 30,
      servicesPerTeam: 20,
      sharedServices: 2,
      seed: 5,
      extraServices: ['idle-labelled', 'idle-unlabelled'],
    });
    const services = [...estate.services].sort(compareNames);
    const namespaceOf = (service: string): string | undefined => {
      const team = estate.teamOf.get(service);
      if (service === 'shared-0') {
        return 'platform';
      }
      if (service === 'idle-labelled') {
        return 'team-3';
      }
      return team === 'shared' || team === 'extra' ? undefined : team;
    };
    const attributes: ServiceGroupingAttributes = Object.fromEntries(
      services.map((service) => [service, { serviceNamespace: namespaceOf(service) }])
    );
    const grouping = buildServiceGrouping({
      callGraph: callGraphOf(estate),
      spans: [],
      services,
      attributes,
    });

    it('puts a service shared by calls in its namespace group', () => {
      expect(groupOf(grouping, services, 'calls', 'shared-0')?.kind).toBe('shared');
      expect(groupOf(grouping, services, 'service.namespace', 'shared-0')?.id).toBe(
        'service.namespace:platform'
      );
    });

    it('groups services with no calls by their namespace, or with no namespace', () => {
      expect(groupOf(grouping, services, 'calls', 'idle-labelled')?.kind).toBe('notConnected');
      expect(groupOf(grouping, services, 'service.namespace', 'idle-labelled')?.id).toBe(
        'service.namespace:team-3'
      );
      expect(groupOf(grouping, services, 'service.namespace', 'idle-unlabelled')?.kind).toBe(
        'noAttribute'
      );
      expect(groupOf(grouping, services, 'service.namespace', 'shared-1')?.kind).toBe(
        'noAttribute'
      );
    });

    it('leaves the strategy out when no service sets a namespace', () => {
      const withoutNamespaces = buildServiceGrouping({
        callGraph: callGraphOf(estate),
        spans: [],
        services,
        attributes: Object.fromEntries(
          services.map((service) => [service, { serviceNamespace: '' }])
        ),
      });

      expect(withoutNamespaces?.strategies.map(({ source }) => source)).not.toContain(
        'service.namespace'
      );
    });
  });

  describe('by kubernetes.namespace', () => {
    const estate = syntheticEstate({ teams: 30, servicesPerTeam: 20, sharedServices: 2, seed: 5 });
    const services = [...estate.services].sort(compareNames);
    const teamNumberOf = (service: string) => {
      const team = estate.teamOf.get(service);
      return team?.startsWith('team-') ? Number(team.slice('team-'.length)) : undefined;
    };
    // a Kubernetes namespace holds two teams, so it groups services unlike service.namespace
    const kubernetesNamespaceOf = (service: string) => {
      const team = teamNumberOf(service);
      return team === undefined ? undefined : `k8s-${Math.floor(team / 2)}`;
    };
    const serviceNamespaceOf = (service: string) =>
      service === 'shared-0' ? 'platform' : estate.teamOf.get(service);
    const build = (attributes: ServiceGroupingAttributes) =>
      buildServiceGrouping({ callGraph: callGraphOf(estate), spans: [], services, attributes });
    const grouping = build(
      Object.fromEntries(
        services.map((service) => [
          service,
          {
            serviceNamespace: serviceNamespaceOf(service),
            kubernetesNamespace: kubernetesNamespaceOf(service),
          },
        ])
      )
    );
    const firstOfTeam = (team: string) => {
      const found = services.find((service) => estate.teamOf.get(service) === team);
      if (!found) {
        throw new Error(`${team} has no services`);
      }
      return found;
    };
    const teamTwo = firstOfTeam('team-2');
    const teamThree = firstOfTeam('team-3');

    it('groups services by their Kubernetes namespace, apart from their service.namespace', () => {
      expect(grouping?.strategies.map(({ source }) => source)).toEqual([
        'calls',
        'service.namespace',
        'kubernetes.namespace',
      ]);
      for (const service of [teamTwo, teamThree]) {
        expect(groupOf(grouping, services, 'kubernetes.namespace', service)?.id).toBe(
          'kubernetes.namespace:k8s-1'
        );
      }
      expect(groupOf(grouping, services, 'service.namespace', teamTwo)?.id).not.toBe(
        groupOf(grouping, services, 'service.namespace', teamThree)?.id
      );
    });

    it('puts a service with no Kubernetes namespace in the group with none, whatever its service.namespace', () => {
      expect(groupOf(grouping, services, 'service.namespace', 'shared-0')?.id).toBe(
        'service.namespace:platform'
      );
      expect(groupOf(grouping, services, 'kubernetes.namespace', 'shared-0')?.kind).toBe(
        'noAttribute'
      );
    });

    it('leaves out only the strategy whose attribute no service sets', () => {
      const onlyKubernetes = build(
        Object.fromEntries(
          services.map((service) => [
            service,
            { kubernetesNamespace: kubernetesNamespaceOf(service) },
          ])
        )
      );

      expect(onlyKubernetes?.strategies.map(({ source }) => source)).toEqual([
        'calls',
        'kubernetes.namespace',
      ]);
    });
  });
});
