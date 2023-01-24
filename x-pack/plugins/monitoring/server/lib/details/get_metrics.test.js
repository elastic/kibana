/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMetrics } from './get_metrics';
import sinon from 'sinon';

import nonDerivMetricsBuckets from './__fixtures__/non_deriv_metrics_buckets.json';
import derivMetricsBuckets from './__fixtures__/deriv_metrics_buckets.json';
import aggMetricsBuckets from './__fixtures__/agg_metrics_buckets.json';

// max / min window that accepts the above buckets/results
const min = 1498968000000; // 2017-07-02T04:00:00.000Z
const max = 1499054399999; // 2017-07-03T03:59:59.999Z

jest.mock('../../static_globals', () => ({
  Globals: {
    app: {
      config: {
        ui: {
          ccs: { enabled: true },
        },
      },
    },
  },
}));

function getMockReq(metricsBuckets = []) {
  return {
    server: {
      config: { ui: { min_interval_seconds: 10 } },
      plugins: {
        elasticsearch: {
          getCluster: sinon
            .stub()
            .withArgs('monitoring')
            .returns({
              callWithRequest: sinon.stub().returns(
                Promise.resolve({
                  aggregations: {
                    check: {
                      buckets: metricsBuckets,
                    },
                  },
                })
              ),
            }),
        },
      },
    },
    payload: {
      timeRange: { min, max },
    },
    params: {
      clusterUuid: '1234xyz',
    },
    getUiSettingsService: () => ({
      get: () => 'Browser',
    }),
  };
}

describe('getMetrics and getSeries', () => {
  it('should return metrics with non-derivative metric', async () => {
    const req = getMockReq(nonDerivMetricsBuckets);
    const metricSet = ['node_cpu_utilization'];
    const result = await getMetrics(req, 'elasticsearch', metricSet);
    expect(result).toMatchSnapshot();
  });

  it('should return metrics with derivative metric', async () => {
    const req = getMockReq(derivMetricsBuckets);
    const metricSet = ['cluster_search_request_rate'];
    const result = await getMetrics(req, 'elasticsearch', metricSet);
    expect(result).toMatchSnapshot();
  });

  it('should return metrics with metric containing custom aggs', async () => {
    const req = getMockReq(aggMetricsBuckets);
    const metricSet = ['cluster_index_latency'];
    const result = await getMetrics(req, 'elasticsearch', metricSet);
    expect(result).toMatchSnapshot();
  });

  it('should return metrics with object structure for metric', async () => {
    const req = getMockReq(nonDerivMetricsBuckets);
    const metricSet = [
      {
        name: 'index_3',
        keys: ['index_mem_fixed_bit_set', 'index_mem_versions'],
      },
    ];
    const result = await getMetrics(req, 'elasticsearch', metricSet);
    expect(result).toMatchSnapshot();
  });

  it('should return metrics with metric that uses default calculation', async () => {
    const req = getMockReq(nonDerivMetricsBuckets);
    const metricSet = ['kibana_max_response_times'];
    const result = await getMetrics(req, 'elasticsearch', metricSet);
    expect(result).toMatchSnapshot();
  });
});
