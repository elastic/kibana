/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_NAME, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
import type { ServiceMapSpan, ServicesResponse } from '../../../../common/service_map/types';
import type { ServiceCallGraph } from '../get_service_call_graph';
import { buildServiceGrouping } from './build_service_grouping';
import { SERVICE_GROUPING_MIN_SERVICES } from './constants';
import { groupServicesByCalls } from './group_services_by_calls';
import { syntheticEstate } from './test_helpers';
import { compareNames } from './utils';

function servicesData(names: readonly string[]): ServicesResponse[] {
  return names.map((name) => ({
    [SERVICE_NAME]: name,
    [AGENT_NAME]: 'java',
    [SERVICE_ENVIRONMENT]: null,
  }));
}

function span(serviceName: string, destinationServiceName: string): ServiceMapSpan {
  return {
    serviceName,
    agentName: 'java',
    spanId: `${serviceName}-${destinationServiceName}`,
    spanType: 'external',
    spanSubtype: 'http',
    spanDestinationServiceResource: `${destinationServiceName}:8080`,
    destinationService: { serviceName: destinationServiceName, agentName: 'java' },
  };
}

const names = (count: number) =>
  Array.from({ length: count }, (_, index) => `svc-${String(index).padStart(3, '0')}`);

describe('buildServiceGrouping', () => {
  it(`leaves a map with fewer than ${SERVICE_GROUPING_MIN_SERVICES} services ungrouped`, () => {
    expect(
      buildServiceGrouping({
        callGraph: {},
        spans: [],
        servicesData: servicesData(names(SERVICE_GROUPING_MIN_SERVICES - 1)),
      })
    ).toBeUndefined();
    expect(
      buildServiceGrouping({
        callGraph: {},
        spans: [],
        servicesData: servicesData(names(SERVICE_GROUPING_MIN_SERVICES)),
      })
    ).toBeDefined();
  });

  it('groups the services the map draws, from the services query and the sample of traces, sorted', () => {
    const grouping = buildServiceGrouping({
      callGraph: {},
      spans: [span('from-sample', 'constructor')],
      servicesData: servicesData(names(SERVICE_GROUPING_MIN_SERVICES - 2)),
    });

    expect(grouping?.services).toEqual(
      [...names(SERVICE_GROUPING_MIN_SERVICES - 2), 'constructor', 'from-sample'].sort(compareNames)
    );
  });

  it('puts every service in the not connected group when there are no calls between them', () => {
    const grouping = buildServiceGrouping({
      callGraph: {},
      spans: [],
      servicesData: servicesData(names(SERVICE_GROUPING_MIN_SERVICES)),
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
    // destinations named after the services they reach, as matching resolves them by host name
    const callGraph: ServiceCallGraph = Object.fromEntries(
      Object.entries(estate.callGraph).map(([caller, callees]) => [
        caller,
        callees.map(({ service, calls }) => ({ destination: service, calls })),
      ])
    );
    const services = [...estate.services].sort(compareNames);

    const grouping = buildServiceGrouping({
      callGraph,
      spans: [],
      servicesData: servicesData(estate.services),
    });

    expect(grouping).toEqual({
      services,
      automatic: 'calls',
      strategies: [
        {
          ...groupServicesByCalls({ services, edges: estate.edges, stats: estate.stats }),
          passes: true,
        },
      ],
    });
  });
});
