/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHistogramIndicator } from '../fixtures/slo';
import { GetHistogramIndicatorAggregation } from './get_histogram_indicator_aggregation';

describe('GetHistogramIndicatorAggregation', () => {
  it('should generate a aggregation for good events', () => {
    const getHistogramIndicatorAggregations = new GetHistogramIndicatorAggregation(
      createHistogramIndicator()
    );
    expect(
      getHistogramIndicatorAggregations.execute({ type: 'good', aggregationKey: 'goodEvents' })
    ).toMatchSnapshot();
  });

  it('should generate a aggregation for total events', () => {
    const getHistogramIndicatorAggregations = new GetHistogramIndicatorAggregation(
      createHistogramIndicator()
    );
    expect(
      getHistogramIndicatorAggregations.execute({ type: 'total', aggregationKey: 'totalEvents' })
    ).toMatchSnapshot();
  });

  it('should throw and error when the "from" is greater than "to"', () => {
    const getHistogramIndicatorAggregations = new GetHistogramIndicatorAggregation(
      createHistogramIndicator({
        good: {
          field: 'latency',
          aggregation: 'range',
          from: 100,
          to: 0,
          filter: '',
        },
      })
    );
    expect(() =>
      getHistogramIndicatorAggregations.execute({ type: 'good', aggregationKey: 'goodEvents' })
    ).toThrow('Invalid Range: "from" should be less that "to".');
  });
});
