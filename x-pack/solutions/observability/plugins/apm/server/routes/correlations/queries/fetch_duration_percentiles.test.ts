/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { fetchDurationPercentiles } from './fetch_duration_percentiles';

const percentileValues = {
  '1.0': 10,
  '5.0': 20,
  '25.0': 50,
  '50.0': 100,
  '75.0': 200,
  '95.0': 400,
  '99.0': 800,
};

function createApmEventClient({
  fieldTypes = {},
}: {
  fieldTypes?: Record<string, { type: string }>;
} = {}) {
  return {
    fieldCaps: jest.fn().mockResolvedValue({
      fields: {
        'transaction.duration.histogram': fieldTypes,
      },
    }),
    search: jest.fn().mockResolvedValue({
      hits: { total: { value: 1, relation: 'eq' } },
      aggregations: {
        duration_percentiles: { values: percentileValues },
      },
    }),
  } as unknown as APMEventClient & {
    fieldCaps: jest.Mock;
    search: jest.Mock;
  };
}

const baseParams = {
  start: 0,
  end: 1,
  environment: 'ENVIRONMENT_ALL' as const,
  kuery: '',
  query: { match_all: {} },
  chartType: LatencyDistributionChartType.transactionLatency,
};

describe('fetchDurationPercentiles', () => {
  it('keeps HDR percentiles for raw transaction events', async () => {
    const apmEventClient = createApmEventClient();

    await fetchDurationPercentiles({
      ...baseParams,
      apmEventClient,
      searchMetrics: false,
    });

    expect(apmEventClient.fieldCaps).not.toHaveBeenCalled();
    expect(apmEventClient.search).toHaveBeenCalledWith(
      'get_duration_percentiles',
      expect.objectContaining({
        aggs: {
          duration_percentiles: {
            percentiles: expect.objectContaining({
              field: 'transaction.duration.us',
              hdr: { number_of_significant_value_digits: 3 },
            }),
          },
        },
      }),
      expect.anything()
    );
  });

  it('keeps HDR percentiles for classic histogram mappings', async () => {
    const apmEventClient = createApmEventClient({
      fieldTypes: {
        histogram: { type: 'histogram' },
      },
    });

    await fetchDurationPercentiles({
      ...baseParams,
      apmEventClient,
      searchMetrics: true,
    });

    expect(apmEventClient.fieldCaps).toHaveBeenCalledWith(
      'get_duration_field_caps',
      expect.objectContaining({
        fields: ['transaction.duration.histogram'],
        include_empty_fields: true,
      })
    );
    expect(apmEventClient.fieldCaps.mock.calls[0][1].index_filter).toBeUndefined();
    expect(apmEventClient.search.mock.calls[0][1].aggs.duration_percentiles.percentiles).toEqual(
      expect.objectContaining({
        field: 'transaction.duration.histogram',
        hdr: { number_of_significant_value_digits: 3 },
      })
    );
  });

  it('omits HDR percentiles when the duration field is exponential_histogram', async () => {
    const apmEventClient = createApmEventClient({
      fieldTypes: {
        exponential_histogram: { type: 'exponential_histogram' },
      },
    });

    await fetchDurationPercentiles({
      ...baseParams,
      apmEventClient,
      searchMetrics: true,
    });

    const percentilesAgg =
      apmEventClient.search.mock.calls[0][1].aggs.duration_percentiles.percentiles;
    expect(percentilesAgg.field).toBe('transaction.duration.histogram');
    expect(percentilesAgg.hdr).toBeUndefined();
  });

  it('omits HDR percentiles when histogram and exponential_histogram mappings are mixed', async () => {
    const apmEventClient = createApmEventClient({
      fieldTypes: {
        histogram: { type: 'histogram' },
        exponential_histogram: { type: 'exponential_histogram' },
      },
    });

    await fetchDurationPercentiles({
      ...baseParams,
      apmEventClient,
      searchMetrics: true,
    });

    expect(
      apmEventClient.search.mock.calls[0][1].aggs.duration_percentiles.percentiles.hdr
    ).toBeUndefined();
  });
});
