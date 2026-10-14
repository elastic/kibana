/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getServiceTransactionGroupsAlerts } from './get_service_transaction_groups_alerts';

interface QueryFilter {
  term?: Record<string, string>;
  range?: Record<string, unknown>;
}

const createMockAlertsClient = () => ({
  search: jest.fn().mockResolvedValue({
    aggregations: {
      transaction_groups: {
        buckets: [],
      },
    },
  }),
});

function getFilters(client: ReturnType<typeof createMockAlertsClient>): QueryFilter[] {
  return client.search.mock.calls[0][0].query.bool.filter;
}

describe('getServiceTransactionGroupsAlerts', () => {
  it('filters by active status and time range', async () => {
    const client = createMockAlertsClient();
    const start = Date.now() - 3600000;
    const end = Date.now();

    await getServiceTransactionGroupsAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      latencyAggregationType: LatencyAggregationType.avg,
      start,
      end,
    });

    const filters = getFilters(client);

    expect(filters).toEqual(
      expect.arrayContaining([{ term: { [ALERT_STATUS]: ALERT_STATUS_ACTIVE } }])
    );
    expect(filters.find((f) => f.range)).toBeDefined();
  });

  it('extends a past end to now so currently-active alerts are not missed', async () => {
    const client = createMockAlertsClient();
    const nowMs = Date.parse('2026-05-12T13:00:00.000Z');
    const start = nowMs - 3600000;
    const pastEnd = nowMs - 60000;
    const realDateNow = Date.now;
    Date.now = jest.fn(() => nowMs);

    try {
      await getServiceTransactionGroupsAlerts({
        apmAlertsClient: client as unknown as ApmAlertsClient,
        latencyAggregationType: LatencyAggregationType.avg,
        start,
        end: pastEnd,
      });
    } finally {
      Date.now = realDateNow;
    }

    const rangeFilter = getFilters(client).find((f) => f.range);
    expect(rangeFilter?.range?.['@timestamp']).toEqual(
      expect.objectContaining({
        gte: start,
        lte: nowMs,
      })
    );
  });

  it('returns aggregated alert counts per transaction group', async () => {
    const client = createMockAlertsClient();
    client.search.mockResolvedValue({
      aggregations: {
        transaction_groups: {
          buckets: [
            { key: 'GET /api', doc_count: 3 },
            { key: 'POST /api', doc_count: 1 },
          ],
        },
      },
    });

    const result = await getServiceTransactionGroupsAlerts({
      apmAlertsClient: client as unknown as ApmAlertsClient,
      latencyAggregationType: LatencyAggregationType.avg,
      start: Date.now() - 3600000,
      end: Date.now(),
    });

    expect(result).toEqual([
      { name: 'GET /api', alertsCount: 3 },
      { name: 'POST /api', alertsCount: 1 },
    ]);
  });
});
