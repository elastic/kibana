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

function renderSparkPlotItem(series: Coordinate[] | null, end?: number) {
  return render(
    <SparkPlotItem type="line" color="#000" isLoading={false} series={series} end={end} />
  );
}

describe('SparkPlotItem', () => {
  it('renders the no-data icon when the series has no valid points', () => {
    const { container } = renderSparkPlotItem([
      { x: 1, y: null },
      { x: 2, y: null },
    ]);

    expect(container.querySelector('[data-euiicon-type="chartLine"]')).toBeInTheDocument();
  });

  it('keeps the untrimmed series when trimming would remove the only valid point', () => {
    // A newly reporting service only has data in its final, partial bucket.
    // Trimming would leave an all-null series, so the untrimmed series is kept
    // and the chart (not the no-data icon) is rendered.
    const { container } = renderSparkPlotItem(
      [
        { x: 1, y: null },
        { x: 2, y: null },
        { x: 3, y: 5 },
      ],
      3.5
    );

    expect(container.querySelector('[data-euiicon-type="chartLine"]')).not.toBeInTheDocument();
  });

  it('renders the chart when valid points remain after trimming', () => {
    const { container } = renderSparkPlotItem(
      [
        { x: 1, y: 5 },
        { x: 2, y: 8 },
        { x: 3, y: 0 },
      ],
      3.5
    );

    expect(container.querySelector('[data-euiicon-type="chartLine"]')).not.toBeInTheDocument();
  });
});
