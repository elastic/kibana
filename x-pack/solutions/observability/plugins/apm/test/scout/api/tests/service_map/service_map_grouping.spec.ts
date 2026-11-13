/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import type { ServiceMapGrouping, ServiceMapResponse } from '@kbn/apm-types';
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
  SERVICE_MAP_GROUPING_SERVICES,
  SERVICE_MAP_GROUPING_SHARED,
  SERVICE_MAP_GROUPING_START_DATE,
  SERVICE_MAP_GROUPING_TEAMS,
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

/** Each group's id, with its services sorted. */
const getMembersByGroupId = ({ services, strategies: [calls] }: ServiceMapGrouping) => {
  const members: Record<string, string[]> = {};
  services.forEach((service, index) => {
    const { id } = calls.groups[calls.assignment[index]];
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
  'Service map grouping by calls',
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
        const { services, automatic, strategies } = getServiceGrouping(response.body);
        expect(services).toStrictEqual(sorted(SERVICE_MAP_GROUPING_SERVICES));
        expect(automatic).toBe('calls');
        expect(strategies).toHaveLength(1);
        expect(strategies[0]).toMatchObject({ source: 'calls', passes: true });
        expect(strategies[0].assignment).toHaveLength(SERVICE_MAP_GROUPING_SERVICES.length);
      }
    );

    apiTest('finds each team, named after one of its services', async ({ apiClient }) => {
      const response = await getServiceMap(apiClient, { headers, query: GROUPING_QUERY });

      expect(response).toHaveStatusCode(200);
      const serviceGrouping = getServiceGrouping(response.body);
      const membersByGroupId = getMembersByGroupId(serviceGrouping);
      const callsGroups = serviceGrouping.strategies[0].groups.flatMap((group) =>
        group.kind === 'calls' ? [group] : []
      );

      expect(
        callsGroups.map(({ id }) => membersByGroupId[id]).sort((a, b) => a[0].localeCompare(b[0]))
      ).toStrictEqual(SERVICE_MAP_GROUPING_TEAMS.map(sorted));
      for (const { id, busiestService } of callsGroups) {
        expect(id).toBe(`calls:${busiestService}`);
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
