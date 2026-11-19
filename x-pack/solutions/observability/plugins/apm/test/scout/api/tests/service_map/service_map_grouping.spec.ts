/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import type { ServiceGroupingSource, ServiceMapGrouping, ServiceMapResponse } from '@kbn/apm-types';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-types';
import { enableServiceMapGrouping, removeServiceMapGroupingOverride } from '../../../shared';
import {
  apiTest,
  COMMON_HEADERS,
  getServiceMap,
  SERVICE_GROUPING_MIN_SERVICES,
  toSourceQuery,
  SERVICE_MAP_GROUPING_END_DATE,
  SERVICE_MAP_GROUPING_ENVIRONMENT,
  SERVICE_MAP_GROUPING_NOT_CONNECTED,
  SERVICE_MAP_GROUPING_PLATFORM,
  SERVICE_MAP_GROUPING_PLATFORM_NAMESPACE,
  SERVICE_MAP_GROUPING_SERVICES,
  SERVICE_MAP_GROUPING_SHARED,
  SERVICE_MAP_GROUPING_START_DATE,
  SERVICE_MAP_GROUPING_TEAM_NAMESPACES,
  SERVICE_MAP_GROUPING_TEAMS,
  SERVICE_MAP_GROUPING_WITHOUT_NAMESPACE,
} from '../../fixtures';

const GROUPING_QUERY = {
  start: SERVICE_MAP_GROUPING_START_DATE,
  end: SERVICE_MAP_GROUPING_END_DATE,
  environment: SERVICE_MAP_GROUPING_ENVIRONMENT,
  ...toSourceQuery({
    documentType: ApmDocumentType.ServiceTransactionMetric,
    rollupInterval: RollupInterval.OneMinute,
    useDurationSummary: true,
  }),
};

const getStrategy = ({ strategies }: ServiceMapGrouping, source: ServiceGroupingSource) => {
  const strategy = strategies.find((candidate) => candidate.source === source);
  if (!strategy) {
    throw new Error(`The service grouping has no ${source} strategy`);
  }
  return strategy;
};

/** Each group's id in the strategy grouping by `source`, with its services sorted. */
const getMembersByGroupId = (
  serviceGrouping: ServiceMapGrouping,
  source: ServiceGroupingSource = 'calls'
) => {
  const { groups, assignment } = getStrategy(serviceGrouping, source);
  const members: Record<string, string[]> = {};
  serviceGrouping.services.forEach((service, index) => {
    const { id } = groups[assignment[index]];
    members[id] = [...(members[id] ?? []), service].sort();
  });
  return members;
};

const sorted = (services: readonly string[]) => [...services].sort();

const getServiceGrouping = ({ serviceGrouping }: ServiceMapResponse): ServiceMapGrouping => {
  if (!serviceGrouping) {
    throw new Error('The service map response has no serviceGrouping');
  }
  return serviceGrouping;
};

apiTest.describe(
  'Service map grouping',
  // Local servers only: the flag can only be overridden there (see `enableServiceMapGrouping`)
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await enableServiceMapGrouping(apiServices);
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      headers = { ...COMMON_HEADERS, ...cookieHeader };
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await removeServiceMapGroupingOverride(apiServices);
    });

    apiTest(
      'groups every service on the map by its calls, shown automatically',
      async ({ apiClient }) => {
        const response = await getServiceMap(apiClient, { headers, query: GROUPING_QUERY });

        expect(response).toHaveStatusCode(200);
        const serviceGrouping = getServiceGrouping(response.body);
        expect(serviceGrouping.services).toStrictEqual(sorted(SERVICE_MAP_GROUPING_SERVICES));
        expect(serviceGrouping.automatic).toBe('calls');
        const calls = getStrategy(serviceGrouping, 'calls');
        expect(calls.passes).toBe(true);
        expect(calls.assignment).toHaveLength(SERVICE_MAP_GROUPING_SERVICES.length);
      }
    );

    apiTest('finds each team, named after one of its services', async ({ apiClient }) => {
      const response = await getServiceMap(apiClient, { headers, query: GROUPING_QUERY });

      expect(response).toHaveStatusCode(200);
      const serviceGrouping = getServiceGrouping(response.body);
      const membersByGroupId = getMembersByGroupId(serviceGrouping);
      const callsGroups = getStrategy(serviceGrouping, 'calls').groups.flatMap((group) =>
        group.kind === 'calls' ? [group] : []
      );

      expect(
        callsGroups.map(({ id }) => membersByGroupId[id]).sort((a, b) => a[0].localeCompare(b[0]))
      ).toStrictEqual(SERVICE_MAP_GROUPING_TEAMS.map(sorted));
      for (const { id, busiestService } of callsGroups) {
        // members are sorted, so the first is the one the id is built from
        expect(id).toBe(`calls:${membersByGroupId[id][0]}`);
        expect(membersByGroupId[id]).toContain(busiestService);
      }
    });

    apiTest(
      'puts the services every team calls in the shared group, and those cut off from the rest in the not connected group',
      async ({ apiClient }) => {
        const response = await getServiceMap(apiClient, { headers, query: GROUPING_QUERY });

        expect(response).toHaveStatusCode(200);
        const membersByGroupId = getMembersByGroupId(getServiceGrouping(response.body));

        expect(membersByGroupId.shared).toStrictEqual(sorted(SERVICE_MAP_GROUPING_SHARED));
        expect(membersByGroupId.notConnected).toStrictEqual(
          sorted(SERVICE_MAP_GROUPING_NOT_CONNECTED)
        );
      }
    );

    apiTest(
      'groups every service by its service.namespace, and those with none in a single group',
      async ({ apiClient }) => {
        const response = await getServiceMap(apiClient, { headers, query: GROUPING_QUERY });

        expect(response).toHaveStatusCode(200);
        const membersByGroupId = getMembersByGroupId(
          getServiceGrouping(response.body),
          'service.namespace'
        );

        expect(membersByGroupId).toStrictEqual({
          ...Object.fromEntries(
            SERVICE_MAP_GROUPING_TEAMS.map((members, team) => [
              `service.namespace:${SERVICE_MAP_GROUPING_TEAM_NAMESPACES[team]}`,
              sorted(members),
            ])
          ),
          // shared by calls, the platform services still sit with their namespace
          [`service.namespace:${SERVICE_MAP_GROUPING_PLATFORM_NAMESPACE}`]: sorted(
            SERVICE_MAP_GROUPING_PLATFORM
          ),
          noAttribute: sorted(SERVICE_MAP_GROUPING_WITHOUT_NAMESPACE),
        });
      }
    );

    apiTest(
      `does not group a map with fewer than ${SERVICE_GROUPING_MIN_SERVICES} services`,
      async ({ apiClient }) => {
        // only one team's services, and the few their calls reach
        const response = await getServiceMap(apiClient, {
          headers,
          query: { ...GROUPING_QUERY, kuery: 'service.name : grouping-t0-*' },
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as ServiceMapResponse;
        expect(body.servicesData.length).toBeGreaterThan(0);
        expect(body.serviceGrouping).toBeUndefined();
      }
    );

    apiTest('does not group the map of a single service', async ({ apiClient }) => {
      const response = await getServiceMap(apiClient, {
        headers,
        query: { ...GROUPING_QUERY, serviceName: SERVICE_MAP_GROUPING_TEAMS[0][0] },
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as ServiceMapResponse;
      expect(body.servicesData.length).toBeGreaterThan(0);
      expect(body.serviceGrouping).toBeUndefined();
    });
  }
);
