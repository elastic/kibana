/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ServiceMapResponse } from '@kbn/apm-types';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-types';
import {
  apiTest,
  testData,
  SERVICE_MAP_STATS_BACKEND,
  SERVICE_MAP_STATS_END_DATE,
  SERVICE_MAP_STATS_FRONTEND,
  SERVICE_MAP_STATS_START_DATE,
  SERVICE_MAP_STATS_WORKER,
} from '../../fixtures';

const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
  Accept: 'application/json',
};

const getServiceMap = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  query: Record<string, string> = {}
) =>
  apiClient.get(
    `internal/apm/service-map?${new URLSearchParams({
      start: SERVICE_MAP_STATS_START_DATE,
      end: SERVICE_MAP_STATS_END_DATE,
      environment: testData.ENVIRONMENT_ALL,
      kuery: '',
      ...query,
    }).toString()}`,
    { headers, responseType: 'json' }
  );

const toSourceQuery = (
  documentType: ApmDocumentType,
  rollupInterval: RollupInterval,
  useDurationSummary: boolean
): Record<string, string> => ({
  documentType,
  rollupInterval,
  useDurationSummary: String(useDurationSummary),
});

const ALL_SERVICES = [
  SERVICE_MAP_STATS_BACKEND,
  SERVICE_MAP_STATS_FRONTEND,
  SERVICE_MAP_STATS_WORKER,
].sort();

const getServiceNames = (body: ServiceMapResponse) =>
  body.servicesData.map((service) => service['service.name']).sort();

const getServicesWithStats = (body: ServiceMapResponse) =>
  body.servicesData
    .filter((service) => 'stats' in service)
    .map((service) => service['service.name']);

// Removed together with the service map grouping flag, when the stats are always returned:
// https://github.com/elastic/kibana/issues/300607
apiTest.describe(
  'Service map stats with service map grouping disabled',
  // Regular tags, unlike `service_map_stats.spec.ts`: the flag is off by default, so these tests
  // don't override it and can run on every target, Cloud included
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      headers = { ...COMMON_HEADERS, ...cookieHeader };
    });

    apiTest('returns the services without stats', async ({ apiClient }) => {
      const response = await getServiceMap(apiClient, headers);

      expect(response).toHaveStatusCode(200);
      expect(getServiceNames(response.body)).toStrictEqual(ALL_SERVICES);
      expect(getServicesWithStats(response.body)).toStrictEqual([]);
    });

    apiTest('ignores a data source sent anyway', async ({ apiClient }) => {
      const response = await getServiceMap(
        apiClient,
        headers,
        toSourceQuery(ApmDocumentType.ServiceTransactionMetric, RollupInterval.OneMinute, true)
      );

      expect(response).toHaveStatusCode(200);
      expect(getServiceNames(response.body)).toStrictEqual(ALL_SERVICES);
      expect(getServicesWithStats(response.body)).toStrictEqual([]);
    });
  }
);
