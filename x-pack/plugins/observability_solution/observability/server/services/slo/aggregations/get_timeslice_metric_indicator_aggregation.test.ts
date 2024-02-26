/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTimesliceMetricIndicator } from '../fixtures/slo';
import { GetTimesliceMetricIndicatorAggregation } from './get_timeslice_metric_indicator_aggregation';

describe('GetTimesliceMetricIndicatorAggregation', () => {
  it('should generate an aggregation for basic metrics', () => {
    const indicator = createTimesliceMetricIndicator(
      [
        {
          name: 'A',
          aggregation: 'avg' as const,
          field: 'test.field',
          filter: 'test.category: test',
        },
        {
          name: 'B',
          aggregation: 'max' as const,
          field: 'test.field',
        },
        {
          name: 'C',
          aggregation: 'min' as const,
          field: 'test.field',
        },
        {
          name: 'D',
          aggregation: 'sum' as const,
          field: 'test.field',
        },
        {
          name: 'E',
          aggregation: 'cardinality' as const,
          field: 'test.field',
        },
      ],
      '(A + B + C + D + E) / A'
    );
    const getIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(indicator);
    expect(getIndicatorAggregation.execute('_metric')).toMatchSnapshot();
  });

  it('should generate an aggregation for doc_count', () => {
    const indicator = createTimesliceMetricIndicator(
      [
        {
          name: 'A',
          aggregation: 'doc_count' as const,
          filter: 'test.category: test',
        },
      ],
      'A'
    );
    const getIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(indicator);
    expect(getIndicatorAggregation.execute('_metric')).toMatchSnapshot();
  });

  it('should generate an aggregation for std_deviation', () => {
    const indicator = createTimesliceMetricIndicator(
      [
        {
          name: 'A',
          aggregation: 'std_deviation' as const,
          field: 'test.field',
        },
      ],
      'A'
    );
    const getIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(indicator);
    expect(getIndicatorAggregation.execute('_metric')).toMatchSnapshot();
  });

  it('should generate an aggregation for percentile', () => {
    const indicator = createTimesliceMetricIndicator(
      [
        {
          name: 'A',
          aggregation: 'percentile' as const,
          field: 'test.field',
          percentile: 97,
        },
      ],
      'A'
    );
    const getIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(indicator);
    expect(getIndicatorAggregation.execute('_metric')).toMatchSnapshot();
  });

  it('should generate an aggregation for last_value', () => {
    const indicator = createTimesliceMetricIndicator(
      [
        {
          name: 'A',
          aggregation: 'last_value' as const,
          field: 'test.field',
        },
      ],
      'A'
    );
    const getIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(indicator);
    expect(getIndicatorAggregation.execute('_metric')).toMatchSnapshot();
  });
});
