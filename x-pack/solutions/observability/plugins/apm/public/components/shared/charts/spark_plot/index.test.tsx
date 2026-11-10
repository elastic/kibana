/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import type { Coordinate } from '../../../../../typings/timeseries';
import { SparkPlot, SparkPlotItem } from '.';

// Capture the `data` prop each series receives, keyed by series id, so the tests
// can assert on exactly what the chart is handed after trimming.
const seriesData = new Map<string, Coordinate[]>();

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');
  const recordSeries = (props: any) => {
    if (props.id) {
      seriesData.set(props.id, props.data);
    }
    return null;
  };
  return {
    ...original,
    Chart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Settings: () => null,
    Tooltip: () => null,
    LineSeries: recordSeries,
    BarSeries: recordSeries,
    AreaSeries: recordSeries,
  };
});

beforeEach(() => {
  seriesData.clear();
});

function renderSparkPlotItem(props: Partial<React.ComponentProps<typeof SparkPlotItem>>) {
  return render(
    <SparkPlotItem type="line" color="#000" isLoading={false} series={null} {...props} />
  );
}

describe('SparkPlotItem', () => {
  it('renders the no-data icon when the series has no valid points', () => {
    const { container } = renderSparkPlotItem({
      series: [
        { x: 1, y: null },
        { x: 2, y: null },
      ],
    });

    expect(container.querySelector('[data-euiicon-type="chartLine"]')).toBeInTheDocument();
  });

  it('trims the partial trailing bucket from the line data when end cuts it off', () => {
    renderSparkPlotItem({
      series: [
        { x: 10, y: 5 },
        { x: 20, y: 8 },
        { x: 30, y: 2 },
      ],
      end: 35,
    });

    // splitSeriesAtNullGaps always copies line segments, so compare by value.
    expect(seriesData.get('Sparkline')).toEqual([
      { x: 10, y: 5 },
      { x: 20, y: 8 },
    ]);
  });

  it('keeps the same data (by value) when the range is bucket-aligned', () => {
    const series = [
      { x: 10, y: 5 },
      { x: 20, y: 8 },
      { x: 30, y: 2 },
    ];
    renderSparkPlotItem({ series, end: 40 });

    expect(seriesData.get('Sparkline')).toEqual(series);
  });

  it('keeps the bar data reference when the range is bucket-aligned', () => {
    const series = [
      { x: 10, y: 5 },
      { x: 20, y: 8 },
      { x: 30, y: 2 },
    ];
    renderSparkPlotItem({ type: 'bar', series, end: 40 });

    // Bars are passed straight through without splitting, so the reference holds.
    expect(seriesData.get('barSeries')).toBe(series);
  });

  it('applies the same cut to the comparison series', () => {
    renderSparkPlotItem({
      type: 'bar',
      series: [
        { x: 10, y: 5 },
        { x: 20, y: 8 },
        { x: 30, y: 2 },
      ],
      comparisonSeries: [
        { x: 10, y: 1 },
        { x: 20, y: 2 },
        { x: 30, y: 3 },
      ],
      comparisonSeriesColor: '#111',
      end: 35,
    });

    expect(seriesData.get('barSeries')).toEqual([
      { x: 10, y: 5 },
      { x: 20, y: 8 },
    ]);
    expect(seriesData.get('comparisonBarSeries')).toEqual([
      { x: 10, y: 1 },
      { x: 20, y: 2 },
    ]);
  });

  it('trims the comparison partial tail even when the current tail is null', () => {
    // The current period is idle in its final bucket (null tail, kept so the
    // dotted edge still reads "no data since"), but the comparison period has a
    // non-null, partially covered last bucket. Each series is evaluated on its
    // own, so the comparison tail is trimmed and no longer drops to the edge.
    const series = [
      { x: 10, y: 5 },
      { x: 20, y: 8 },
      { x: 30, y: null },
    ];
    renderSparkPlotItem({
      type: 'bar',
      series,
      comparisonSeries: [
        { x: 10, y: 1 },
        { x: 20, y: 2 },
        { x: 30, y: 3 },
      ],
      comparisonSeriesColor: '#111',
      end: 35,
    });

    // Current series keeps its null tail (reference preserved); comparison loses
    // its partial last bucket.
    expect(seriesData.get('barSeries')).toBe(series);
    expect(seriesData.get('comparisonBarSeries')).toEqual([
      { x: 10, y: 1 },
      { x: 20, y: 2 },
    ]);
  });

  it('keeps the untrimmed series when only the last bucket has data', () => {
    const series = [
      { x: 10, y: null },
      { x: 20, y: null },
      { x: 30, y: 5 },
    ];
    renderSparkPlotItem({ type: 'bar', series, end: 35 });

    // Trimming would leave no valid points, so the untrimmed series is kept.
    expect(seriesData.get('barSeries')).toBe(series);
  });

  it('does not trim a two-point series', () => {
    const series = [
      { x: 10, y: 5 },
      { x: 20, y: 8 },
    ];
    renderSparkPlotItem({ type: 'bar', series, end: 25 });

    expect(seriesData.get('barSeries')).toBe(series);
  });

  it('does not trim when end is undefined', () => {
    const series = [
      { x: 10, y: 5 },
      { x: 20, y: 8 },
      { x: 30, y: 2 },
    ];
    renderSparkPlotItem({ type: 'bar', series });

    expect(seriesData.get('barSeries')).toBe(series);
  });

  it('does not trim when end is NaN', () => {
    const series = [
      { x: 10, y: 5 },
      { x: 20, y: 8 },
      { x: 30, y: 2 },
    ];
    renderSparkPlotItem({ type: 'bar', series, end: NaN });

    expect(seriesData.get('barSeries')).toBe(series);
  });

  it('keeps a stable bar data reference across rerenders', () => {
    const series = [
      { x: 10, y: 5 },
      { x: 20, y: 8 },
      { x: 30, y: 2 },
    ];
    const { rerender } = render(
      <SparkPlotItem type="bar" color="#000" isLoading={false} series={series} end={35} />
    );
    const first = seriesData.get('barSeries');

    rerender(<SparkPlotItem type="bar" color="#000" isLoading={false} series={series} end={35} />);
    const second = seriesData.get('barSeries');

    expect(second).toBe(first);
  });
});

describe('SparkPlot', () => {
  it('forwards end to the trimming logic', () => {
    render(
      <SparkPlot
        type="bar"
        color="#000"
        isLoading={false}
        valueLabel={null}
        series={[
          { x: 10, y: 5 },
          { x: 20, y: 8 },
          { x: 30, y: 2 },
        ]}
        end={35}
      />
    );

    expect(seriesData.get('barSeries')).toEqual([
      { x: 10, y: 5 },
      { x: 20, y: 8 },
    ]);
  });
});
