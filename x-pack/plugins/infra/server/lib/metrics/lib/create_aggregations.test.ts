/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAggregations } from './create_aggregations';
import moment from 'moment';
import { MetricsAPIRequest } from '../../../../common/http_api';

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
  ],
};

describe('createAggregations(options)', () => {
  it('should return groupings aggregation with groupBy', () => {
    const optionsWithGroupBy = { ...options, groupBy: ['host.name'] };
    expect(createAggregations(optionsWithGroupBy)).toMatchSnapshot();
  });
  it('should return just histogram aggregation without groupBy', () => {
    expect(createAggregations(options)).toMatchSnapshot();
  });
  it('should return add offset to histogram', () => {
    const optionsWithAlignDataToEnd = {
      ...options,
      timerange: {
        ...options.timerange,
        from: moment('2020-01-01T00:00:00Z').subtract(28, 'minutes').valueOf(),
        to: moment('2020-01-01T01:00:00Z').subtract(28, 'minutes').valueOf(),
      },
      alignDataToEnd: true,
    };
    expect(createAggregations(optionsWithAlignDataToEnd)).toMatchSnapshot();
  });
});
