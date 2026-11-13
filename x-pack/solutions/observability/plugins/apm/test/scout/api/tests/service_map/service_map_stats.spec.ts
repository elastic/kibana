/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ServiceMapResponse, ServiceMapServiceStats } from '@kbn/apm-types';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-types';
import { enableServiceMapGrouping, removeServiceMapGroupingOverride } from '../../../shared';
import {
  apiTest,
  testData,
  SERVICE_MAP_STATS_BACKEND,
  SERVICE_MAP_STATS_DATA,
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

const MINUTES = 60;
const { frontend, backend, worker } = SERVICE_MAP_STATS_DATA;
const FRONTEND_PER_MINUTE =
  frontend.apiSuccessPerMinute + frontend.apiFailurePerMinute + frontend.otherPerMinute;

const EXPECTED_STATS: Record<string, ServiceMapServiceStats> = {
  [SERVICE_MAP_STATS_FRONTEND]: {
    transactionType: 'request',
    throughput: FRONTEND_PER_MINUTE,
    failedTransactionRate: frontend.apiFailurePerMinute / FRONTEND_PER_MINUTE,
    latency: frontend.durationMs * 1000,
    requestCount: FRONTEND_PER_MINUTE * MINUTES,
  },
  [SERVICE_MAP_STATS_BACKEND]: {
    transactionType: 'request',
    throughput: backend.requestPerMinute,
    failedTransactionRate: 0,
    latency: backend.requestDurationMs * 1000,
    requestCount: backend.requestPerMinute * MINUTES,
  },
  [SERVICE_MAP_STATS_WORKER]: {
    transactionType: 'job',
    throughput: worker.jobPerMinute,
    failedTransactionRate: 0,
    latency: worker.jobDurationMs * 1000,
    requestCount: worker.jobPerMinute * MINUTES,
  },
};

const ALL_SERVICES = Object.keys(EXPECTED_STATS).sort();

const getStatsByService = (body: ServiceMapResponse) =>
  Object.fromEntries(body.servicesData.map((service) => [service['service.name'], service.stats]));

apiTest.describe(
  'Service map stats with service map grouping enabled',
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

    for (const rollupInterval of [
      RollupInterval.OneMinute,
      RollupInterval.TenMinutes,
      RollupInterval.SixtyMinutes,
    ]) {
      apiTest(
        `returns each service's stats from ${rollupInterval} service transaction metrics`,
        async ({ apiClient }) => {
          const response = await getServiceMap(
            apiClient,
            headers,
            toSourceQuery(ApmDocumentType.ServiceTransactionMetric, rollupInterval, true)
          );

          expect(response).toHaveStatusCode(200);
          expect(getStatsByService(response.body)).toStrictEqual(EXPECTED_STATS);
        }
      );
    }

    for (const [documentType, rollupInterval, useDurationSummary] of [
      [ApmDocumentType.TransactionMetric, RollupInterval.OneMinute, true],
      [ApmDocumentType.TransactionEvent, RollupInterval.None, false],
    ] as const) {
      apiTest(
        `returns the same stats from ${documentType} at ${rollupInterval}`,
        async ({ apiClient }) => {
          const response = await getServiceMap(
            apiClient,
            headers,
            toSourceQuery(documentType, rollupInterval, useDurationSummary)
          );

          expect(response).toHaveStatusCode(200);
          const statsByService = getStatsByService(response.body);
          expect(Object.keys(statsByService).sort()).toStrictEqual(ALL_SERVICES);

          for (const [serviceName, { latency, ...expected }] of Object.entries(EXPECTED_STATS)) {
            const { latency: actualLatency, ...actual } = statsByService[serviceName] ?? {};
            expect(actual).toStrictEqual(expected);
            expect(actualLatency).toBeCloseTo(latency ?? 0, 0);
          }
        }
      );
    }

    apiTest(
      'falls back to transaction metrics when the kuery filters on a transaction name',
      async ({ apiClient }) => {
        // Service transaction metrics don't have `transaction.name`, so they match nothing
        const response = await getServiceMap(apiClient, headers, {
          ...toSourceQuery(
            ApmDocumentType.ServiceTransactionMetric,
            RollupInterval.OneMinute,
            true
          ),
          kuery: 'transaction.name : "GET /api"',
        });

        expect(response).toHaveStatusCode(200);
        const apiPerMinute = frontend.apiSuccessPerMinute + frontend.apiFailurePerMinute;
        expect(getStatsByService(response.body)).toStrictEqual({
          [SERVICE_MAP_STATS_FRONTEND]: {
            transactionType: 'request',
            throughput: apiPerMinute,
            failedTransactionRate: frontend.apiFailurePerMinute / apiPerMinute,
            latency: frontend.durationMs * 1000,
            requestCount: apiPerMinute * MINUTES,
          },
        });
      }
    );

    apiTest('rejects a request without a data source', async ({ apiClient }) => {
      const response = await getServiceMap(apiClient, headers);

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('`documentType` and `rollupInterval` are required');
    });
  }
);
