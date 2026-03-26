/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_TYPE_ID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  SLO_BURN_RATE_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import { ALL_VALUE } from '@kbn/slo-schema';
import { getServicesAlerts } from './get_service_alerts';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../common/es_fields/apm';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';

interface QueryFilter {
  bool?: {
    should?: QueryFilter[];
    filter?: QueryFilter[];
    must_not?: QueryFilter | QueryFilter[];
    minimum_should_match?: number;
  };
  term?: Record<string, string>;
  range?: Record<string, unknown>;
  wildcard?: Record<string, string>;
  exists?: { field: string };
}

const createMockAlertsClient = () => ({
  search: jest.fn().mockResolvedValue({
    aggregations: {
      services: {
        buckets: [],
      },
    },
  }),
});

function getFilters(client: ReturnType<typeof createMockAlertsClient>): QueryFilter[] {
  return client.search.mock.calls[0][0].query.bool.filter;
}

function isSloRuleFilter(ff: QueryFilter) {
  return ff.term?.[ALERT_RULE_TYPE_ID] === SLO_BURN_RATE_RULE_TYPE_ID;
}

function hasSloClause(s: QueryFilter) {
  return s.bool?.filter?.some(isSloRuleFilter);
}

function hasSloEnvFilter(filters: QueryFilter[]): boolean {
  return filters.some((f) => f.bool?.should?.some(hasSloClause));
}

describe('getServicesAlerts', () => {
  it('filters by active status and time range', async () => {
    const client = createMockAlertsClient();
    const start = Date.now() - 3600000;
    const end = Date.now();

    await getServicesAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      start,
      end,
    });

    const filters = getFilters(client);

    expect(filters).toEqual(
      expect.arrayContaining([{ term: { [ALERT_STATUS]: ALERT_STATUS_ACTIVE } }])
    );
    expect(filters.find((f) => f.range)).toBeDefined();
  });

  it('filters by serviceName when provided', async () => {
    const client = createMockAlertsClient();

    await getServicesAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      serviceName: 'my-service',
      start: Date.now() - 3600000,
      end: Date.now(),
    });

    const filters = getFilters(client);

    const serviceNameFilter = [{ term: { [SERVICE_NAME]: 'my-service' } }];
    expect(filters).toEqual(expect.arrayContaining(serviceNameFilter));
  });

  it('does not add a serviceName filter when serviceName is undefined', async () => {
    const client = createMockAlertsClient();

    await getServicesAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      start: Date.now() - 3600000,
      end: Date.now(),
    });

    const filters = getFilters(client);
    const hasServiceFilter = filters.some((f) => f.term?.[SERVICE_NAME] !== undefined);

    expect(hasServiceFilter).toBe(false);
  });

  it('adds searchQuery as a wildcard filter', async () => {
    const client = createMockAlertsClient();

    await getServicesAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      searchQuery: 'front*',
      start: Date.now() - 3600000,
      end: Date.now(),
    });

    const filters = getFilters(client);

    expect(filters.find((f) => f.wildcard?.[SERVICE_NAME])).toBeDefined();
  });

  it('includes SLO burn rate alerts with wildcard/missing env when filtering by a specific environment', async () => {
    const client = createMockAlertsClient();

    await getServicesAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      environment: 'production',
      start: Date.now() - 3600000,
      end: Date.now(),
    });

    const filters = getFilters(client);
    const envFilter = filters.find((f) => f.bool?.should?.some(hasSloClause));

    expect(envFilter).toBeDefined();

    const sloClause = envFilter!.bool!.should!.find(hasSloClause);
    expect(sloClause!.bool!.should).toEqual(
      expect.arrayContaining([
        { term: { [SERVICE_ENVIRONMENT]: ALL_VALUE } },
        { bool: { must_not: { exists: { field: SERVICE_ENVIRONMENT } } } },
      ])
    );
    expect(sloClause!.bool!.minimum_should_match).toBe(1);

    const standardEnvClause = envFilter!.bool!.should!.find(
      (s) => s.term?.[SERVICE_ENVIRONMENT] === 'production'
    );
    expect(standardEnvClause).toBeDefined();
  });

  it('does not add SLO-specific environment filter when environment is ENVIRONMENT_ALL', async () => {
    const client = createMockAlertsClient();

    await getServicesAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      environment: ENVIRONMENT_ALL.value,
      start: Date.now() - 3600000,
      end: Date.now(),
    });

    expect(hasSloEnvFilter(getFilters(client))).toBe(false);
  });

  it('falls back to standard environmentQuery when environment is undefined', async () => {
    const client = createMockAlertsClient();

    await getServicesAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      environment: undefined,
      start: Date.now() - 3600000,
      end: Date.now(),
    });

    expect(hasSloEnvFilter(getFilters(client))).toBe(false);
  });

  it('aggregates alerts per service using cardinality on ALERT_UUID', async () => {
    const client = createMockAlertsClient();

    await getServicesAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      start: Date.now() - 3600000,
      end: Date.now(),
    });

    const aggs = client.search.mock.calls[0][0].aggs;

    expect(aggs.services.terms.field).toBe(SERVICE_NAME);
    expect(aggs.services.aggs.alerts_count.cardinality.field).toBe(ALERT_UUID);
  });

  it('returns aggregated alert counts per service', async () => {
    const client = createMockAlertsClient();
    client.search.mockResolvedValue({
      aggregations: {
        services: {
          buckets: [
            { key: 'service-a', alerts_count: { value: 3 } },
            { key: 'service-b', alerts_count: { value: 1 } },
          ],
        },
      },
    });

    const result = await getServicesAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      start: Date.now() - 3600000,
      end: Date.now(),
    });

    expect(result).toEqual([
      { serviceName: 'service-a', alertsCount: 3 },
      { serviceName: 'service-b', alertsCount: 1 },
    ]);
  });

  it('returns empty array when there are no aggregation buckets', async () => {
    const client = createMockAlertsClient();
    client.search.mockResolvedValue({ aggregations: undefined });

    const result = await getServicesAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      start: Date.now() - 3600000,
      end: Date.now(),
    });

    expect(result).toEqual([]);
  });
});
