/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetCustomMetricIndicatorAggregation } from './get_custom_metric_indicator_aggregation';
import { createMetricCustomIndicator } from '../fixtures/slo';

describe('GetHistogramIndicatorAggregation', () => {
  it('should generate a aggregation for good events', () => {
    const getCustomMetricIndicatorAggregation = new GetCustomMetricIndicatorAggregation(
      createMetricCustomIndicator()
    );
    expect(
      getCustomMetricIndicatorAggregation.execute({ type: 'good', aggregationKey: 'goodEvents' })
    ).toMatchSnapshot();
  });

  it('should generate a aggregation for total events', () => {
    const getCustomMetricIndicatorAggregation = new GetCustomMetricIndicatorAggregation(
      createMetricCustomIndicator()
    );
    expect(
      getCustomMetricIndicatorAggregation.execute({ type: 'total', aggregationKey: 'totalEvents' })
    ).toMatchSnapshot();
  });
});
