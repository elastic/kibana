/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APM_EDGE_DOTTED_LINE_STYLE,
  expandApmTimeseriesWithEdgeDottedLines,
  sliceApmTimeseriesToValidYRange,
  splitCoordinateSeriesForEdgeDots,
} from './split_line_series_for_edge_dots';

describe('splitCoordinateSeriesForEdgeDots', () => {
  it('returns empty main and no edges when data is empty', () => {
    expect(splitCoordinateSeriesForEdgeDots([])).toEqual({
      main: [],
      leadingEdge: null,
      trailingEdge: null,
    });
  });

  it('returns a copy of data with no edges when no point has a valid y', () => {
    const data = [
      { x: 1, y: null },
      { x: 2, y: null },
    ];
    const { main, leadingEdge, trailingEdge } = splitCoordinateSeriesForEdgeDots(data);
    expect(main).toEqual(data);
    expect(leadingEdge).toBeNull();
    expect(trailingEdge).toBeNull();
  });

  it('builds horizontal leading and trailing segments when y is null at edges', () => {
    const { main, leadingEdge, trailingEdge } = splitCoordinateSeriesForEdgeDots([
      { x: 10, y: null },
      { x: 20, y: null },
      { x: 30, y: 5 },
      { x: 40, y: 8 },
      { x: 50, y: null },
    ]);

    expect(main).toEqual([
      { x: 30, y: 5 },
      { x: 40, y: 8 },
    ]);
    expect(leadingEdge).toEqual([
      { x: 10, y: 5 },
      { x: 30, y: 5 },
    ]);
    expect(trailingEdge).toEqual([
      { x: 40, y: 8 },
      { x: 50, y: 8 },
    ]);
  });

  it('has no leading or trailing when all points are valid', () => {
    const { main, leadingEdge, trailingEdge } = splitCoordinateSeriesForEdgeDots([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
    expect(main).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
    expect(leadingEdge).toBeNull();
    expect(trailingEdge).toBeNull();
  });
});

describe('expandApmTimeseriesWithEdgeDottedLines', () => {
  it('passes through bar series unchanged', () => {
    const bar = {
      title: 't',
      type: 'bar' as const,
      data: [
        { x: 1, y: 1 },
        { x: 2, y: null },
      ],
    };
    expect(expandApmTimeseriesWithEdgeDottedLines([bar])).toEqual([bar]);
  });

  it('expands line series with leading and trailing edge line specs', () => {
    const expanded = expandApmTimeseriesWithEdgeDottedLines([
      {
        title: 'Throughput',
        type: 'line',
        data: [
          { x: 0, y: null },
          { x: 1, y: 2 },
          { x: 2, y: null },
        ],
      },
    ]);

    expect(expanded).toHaveLength(3);
    expect(expanded[0]).toMatchObject({
      id: 'Throughput__edge_leading',
      type: 'line',
      hideLegend: true,
      hideTooltipValue: true,
      lineSeriesStyle: APM_EDGE_DOTTED_LINE_STYLE,
      data: [
        { x: 0, y: 2 },
        { x: 1, y: 2 },
      ],
    });
    expect(expanded[1]).toMatchObject({
      id: 'Throughput__edge_trailing',
      type: 'line',
      data: [
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
    });
    expect(expanded[2]).toMatchObject({
      id: 'Throughput',
      type: 'line',
      data: [{ x: 1, y: 2 }],
    });
  });

  it('keeps area type on the main series while edge specs are line', () => {
    const expanded = expandApmTimeseriesWithEdgeDottedLines([
      {
        title: 'Previous',
        type: 'area',
        data: [
          { x: 0, y: null },
          { x: 1, y: 3 },
        ],
      },
    ]);

    expect(expanded).toHaveLength(2);
    expect(expanded[0]).toMatchObject({ type: 'line', id: 'Previous__edge_leading' });
    expect(expanded[1]).toMatchObject({ type: 'area', id: 'Previous', data: [{ x: 1, y: 3 }] });
  });
});

describe('sliceApmTimeseriesToValidYRange', () => {
  it('replaces each series data with the trimmed main slice only', () => {
    const sliced = sliceApmTimeseriesToValidYRange([
      {
        title: 'A',
        type: 'area',
        data: [
          { x: 0, y: null },
          { x: 1, y: 1 },
          { x: 2, y: null },
        ],
      },
    ]);

    expect(sliced).toEqual([
      {
        title: 'A',
        type: 'area',
        data: [{ x: 1, y: 1 }],
      },
    ]);
  });
});
