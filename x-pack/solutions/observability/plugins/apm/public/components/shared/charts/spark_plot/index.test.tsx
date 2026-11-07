/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import type { Coordinate } from '../../../../../typings/timeseries';
import { SparkPlotItem } from '.';

function renderSparkPlotItem(series: Coordinate[] | null) {
  return render(<SparkPlotItem type="line" color="#000" isLoading={false} series={series} />);
}

describe('SparkPlotItem', () => {
  it('renders the no-data icon when the series has no valid points', () => {
    const { container } = renderSparkPlotItem([
      { x: 1, y: null },
      { x: 2, y: null },
    ]);

    expect(container.querySelector('[data-euiicon-type="chartLine"]')).toBeInTheDocument();
  });

  it('renders the no-data icon when trimming the partial trailing bucket leaves no valid points', () => {
    // A newly reporting service only has data in its final, partial bucket.
    // hasValidTimeseries passes on the raw series, but trimming removes the
    // single non-null point, so the chart would otherwise render all-null.
    const { container } = renderSparkPlotItem([
      { x: 1, y: null },
      { x: 2, y: null },
      { x: 3, y: 5 },
    ]);

    expect(container.querySelector('[data-euiicon-type="chartLine"]')).toBeInTheDocument();
  });

  it('renders the chart when valid points remain after trimming', () => {
    const { container } = renderSparkPlotItem([
      { x: 1, y: 5 },
      { x: 2, y: 8 },
      { x: 3, y: 0 },
    ]);

    expect(container.querySelector('[data-euiicon-type="chartLine"]')).not.toBeInTheDocument();
  });
});
