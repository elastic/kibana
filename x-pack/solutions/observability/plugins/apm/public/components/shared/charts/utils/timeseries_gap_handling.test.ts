/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APM_DOTTED_LINE_STYLE,
  expandTimeseriesWithDottedGapLines,
  sliceTimeseriesToValidYRange,
  splitSeriesAtNullGaps,
} from './timeseries_gap_handling';

describe('splitSeriesAtNullGaps', () => {
  it('returns empty segments and no edges when data is empty', () => {
    expect(splitSeriesAtNullGaps([])).toEqual({
      mainSegments: [],
      leadingEdge: null,
      trailingEdge: null,
      interiorEdges: [],
    });
  });

  it('returns a copy of data with no edges when no point has a valid y', () => {
    const data = [
      { x: 1, y: null },
      { x: 2, y: null },
    ];
    const { mainSegments, leadingEdge, trailingEdge, interiorEdges } = splitSeriesAtNullGaps(data);
    expect(mainSegments).toEqual([data]);
    expect(leadingEdge).toBeNull();
    expect(trailingEdge).toBeNull();
    expect(interiorEdges).toEqual([]);
  });

  it('builds horizontal leading and trailing segments when y is null at edges', () => {
    const { mainSegments, leadingEdge, trailingEdge, interiorEdges } = splitSeriesAtNullGaps([
      { x: 10, y: null },
      { x: 20, y: null },
      { x: 30, y: 5 },
      { x: 40, y: 8 },
      { x: 50, y: null },
    ]);

    expect(mainSegments).toEqual([
      [
        { x: 30, y: 5 },
        { x: 40, y: 8 },
      ],
    ]);
    expect(leadingEdge).toEqual([
      { x: 10, y: 5 },
      { x: 30, y: 5 },
    ]);
    expect(trailingEdge).toEqual([
      { x: 40, y: 8 },
      { x: 50, y: 8 },
    ]);
    expect(interiorEdges).toEqual([]);
  });

  it('has no leading or trailing when all points are valid', () => {
    const { mainSegments, leadingEdge, trailingEdge, interiorEdges } = splitSeriesAtNullGaps([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
    expect(mainSegments).toEqual([
      [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    ]);
    expect(leadingEdge).toBeNull();
    expect(trailingEdge).toBeNull();
    expect(interiorEdges).toEqual([]);
  });

  it('includes trailing y:0 in the main series (no trailing dotted line)', () => {
    const { mainSegments, leadingEdge, trailingEdge, interiorEdges } = splitSeriesAtNullGaps([
      { x: 10, y: null },
      { x: 20, y: 50 },
      { x: 30, y: 30 },
      { x: 40, y: 0 },
      { x: 50, y: 0 },
    ]);

    expect(mainSegments).toEqual([
      [
        { x: 20, y: 50 },
        { x: 30, y: 30 },
        { x: 40, y: 0 },
        { x: 50, y: 0 },
      ],
    ]);
    expect(leadingEdge).toEqual([
      { x: 10, y: 50 },
      { x: 20, y: 50 },
    ]);
    expect(trailingEdge).toBeNull();
    expect(interiorEdges).toEqual([]);
  });

  it('splits interior null gaps into separate segments with dotted connectors', () => {
    const { mainSegments, leadingEdge, trailingEdge, interiorEdges } = splitSeriesAtNullGaps([
      { x: 100, y: 5 },
      { x: 200, y: null },
      { x: 300, y: null },
      { x: 400, y: 2 },
    ]);

    expect(mainSegments).toEqual([[{ x: 100, y: 5 }], [{ x: 400, y: 2 }]]);
    expect(leadingEdge).toBeNull();
    expect(trailingEdge).toBeNull();
    expect(interiorEdges).toEqual([
      [
        { x: 100, y: 5 },
        { x: 400, y: 2 },
      ],
    ]);
  });

  it('handles multiple interior gaps', () => {
    const { mainSegments, interiorEdges } = splitSeriesAtNullGaps([
      { x: 100, y: 10 },
      { x: 200, y: null },
      { x: 300, y: 4 },
      { x: 400, y: null },
      { x: 500, y: 8 },
    ]);

    expect(mainSegments).toEqual([[{ x: 100, y: 10 }], [{ x: 300, y: 4 }], [{ x: 500, y: 8 }]]);
    expect(interiorEdges).toEqual([
      [
        { x: 100, y: 10 },
        { x: 300, y: 4 },
      ],
      [
        { x: 300, y: 4 },
        { x: 500, y: 8 },
      ],
    ]);
  });
});

describe('expandTimeseriesWithDottedGapLines', () => {
  it('passes through bar series unchanged', () => {
    const bar = {
      title: 't',
      type: 'bar' as const,
      data: [
        { x: 1, y: 1 },
        { x: 2, y: null },
      ],
    };
    expect(expandTimeseriesWithDottedGapLines([bar])).toEqual([bar]);
  });

  it('keeps all-null line series available to rendering callers', () => {
    const data = [
      { x: 1, y: null },
      { x: 2, y: null },
    ];

    expect(expandTimeseriesWithDottedGapLines([{ title: 'All null', type: 'line', data }])).toEqual(
      [{ title: 'All null', type: 'line', data, id: 'All null', hideLegend: false }]
    );
  });

  it('expands line series with leading and trailing edge line specs', () => {
    const expanded = expandTimeseriesWithDottedGapLines([
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
      lineSeriesStyle: APM_DOTTED_LINE_STYLE,
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
    const expanded = expandTimeseriesWithDottedGapLines([
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

  it('creates dotted connectors for interior null gaps in line series', () => {
    const expanded = expandTimeseriesWithDottedGapLines([
      {
        title: 'Latency',
        type: 'line',
        data: [
          { x: 100, y: 5 },
          { x: 200, y: null },
          { x: 300, y: 2 },
        ],
      },
    ]);

    expect(expanded).toHaveLength(3);
    expect(expanded[0]).toMatchObject({
      id: 'Latency__edge_gap_0',
      type: 'line',
      hideLegend: true,
      hideTooltipValue: true,
      lineSeriesStyle: APM_DOTTED_LINE_STYLE,
      data: [
        { x: 100, y: 5 },
        { x: 300, y: 2 },
      ],
    });
    expect(expanded[1]).toMatchObject({
      id: 'Latency',
      type: 'line',
      data: [{ x: 100, y: 5 }],
    });
    expect(expanded[2]).toMatchObject({
      id: 'Latency__seg_1',
      type: 'line',
      data: [{ x: 300, y: 2 }],
      hideLegend: true,
    });
    expect(expanded[2].hideTooltipValue).toBeFalsy();
  });

  it('keeps continuous area fill across gaps with fit linear', () => {
    const data = [
      { x: 100, y: 5 },
      { x: 200, y: null },
      { x: 300, y: 2 },
    ];
    const expanded = expandTimeseriesWithDottedGapLines([
      { title: 'ErrorRate', type: 'area', data },
    ]);

    const gapConnector = expanded.find((s) => s.id === 'ErrorRate__edge_gap_0');
    expect(gapConnector).toMatchObject({
      type: 'line',
      hideLegend: true,
      hideTooltipValue: true,
      lineSeriesStyle: APM_DOTTED_LINE_STYLE,
    });

    const areaFill = expanded.find((s) => s.id === 'ErrorRate__area_fill');
    expect(areaFill).toMatchObject({
      type: 'area',
      data,
      fit: 'linear',
      hideLegend: true,
      hideTooltipValue: true,
    });

    const firstSegment = expanded.find((s) => s.id === 'ErrorRate');
    expect(firstSegment).toMatchObject({ type: 'line', data: [{ x: 100, y: 5 }] });

    const extraSegments = expanded.filter((s) => s.id?.toString().startsWith('ErrorRate__seg_'));
    expect(extraSegments).toHaveLength(1);
    expect(extraSegments[0]).toMatchObject({
      type: 'line',
      data: [{ x: 300, y: 2 }],
      hideLegend: true,
    });
    expect(extraSegments[0].hideTooltipValue).toBeFalsy();
  });
});

describe('sliceTimeseriesToValidYRange', () => {
  it('replaces each series data with the trimmed main slice only', () => {
    const sliced = sliceTimeseriesToValidYRange([
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
