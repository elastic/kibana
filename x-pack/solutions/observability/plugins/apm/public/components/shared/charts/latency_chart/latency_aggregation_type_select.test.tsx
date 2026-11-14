/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { LatencyAggregationTypeSelect } from './latency_aggregation_type_select';

const getOptionLabels = () =>
  Array.from(screen.getByTestId('apmLatencyChartSelect').querySelectorAll('option')).map(
    (option) => option.textContent
  );

describe('LatencyAggregationTypeSelect', () => {
  it('renders the full option labels with the "Metric" prepend by default', () => {
    render(
      <LatencyAggregationTypeSelect
        latencyAggregationType={LatencyAggregationType.avg}
        onChange={jest.fn()}
      />
    );

    expect(getOptionLabels()).toEqual(['Average', '95th percentile', '99th percentile']);
    expect(screen.getByText('Metric')).toBeInTheDocument();
  });

  it('renders short option labels without the prepend when compact', () => {
    render(
      <LatencyAggregationTypeSelect
        latencyAggregationType={LatencyAggregationType.avg}
        onChange={jest.fn()}
        compact
      />
    );

    expect(getOptionLabels()).toEqual(['Avg', 'p95th', 'p99th']);
    expect(screen.queryByText('Metric')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Metric selector')).toBeInTheDocument();
  });

  it('reports the selected aggregation type when compact', () => {
    const onChange = jest.fn();
    render(
      <LatencyAggregationTypeSelect
        latencyAggregationType={LatencyAggregationType.avg}
        onChange={onChange}
        compact
      />
    );

    fireEvent.change(screen.getByTestId('apmLatencyChartSelect'), {
      target: { value: LatencyAggregationType.p99 },
    });

    expect(onChange).toHaveBeenCalledWith(LatencyAggregationType.p99);
  });
});
