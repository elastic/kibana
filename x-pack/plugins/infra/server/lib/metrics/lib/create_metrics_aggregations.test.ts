/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsAPIRequest } from '../../../../common/http_api';
import moment from 'moment';
import { createMetricsAggregations } from './create_metrics_aggregations';

const options: MetricsAPIRequest = {
  timerange: {
    from: moment('2020-01-01T00:00:00Z').valueOf(),
    to: moment('2020-01-01T01:00:00Z').valueOf(),
    interval: '>=1m',
  },
  limit: 20,
  indexPattern: 'metrics-*',
  metrics: [
    { id: 'metric_0', aggregations: { metric_0: { avg: { field: 'system.cpu.user.pct' } } } },
    {
      id: 'metric_1',
      aggregations: {
        metric_1_max: { max: { field: 'system.network.in.bytes' } },
        metric_1: { derivative: { buckets_path: 'metric_1_max', gap_policy: 'skip', unit: '1s' } },
      },
    },
  ],
};

describe('createMetricsAggregations(options)', () => {
  it('should just work', () => {
    expect(createMetricsAggregations(options)).toMatchSnapshot();
  });
});
