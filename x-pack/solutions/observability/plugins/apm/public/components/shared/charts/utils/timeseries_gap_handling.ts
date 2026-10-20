/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AreaSeriesStyle, LineSeriesStyle, RecursivePartial } from '@elastic/charts';
import type { Coordinate, TimeSeries } from '../../../../../typings/timeseries';

function isValidY(y: number | null | undefined): y is number {
  return y != null && !Number.isNaN(y);
}

/** Dotted stroke for no-data gap segments (y null on server). */
export const APM_DOTTED_LINE_STYLE: RecursivePartial<LineSeriesStyle> = {
  line: {
    dash: [4, 4],
    strokeWidth: 1,
  },
  point: { opacity: 0, visible: 'never' },
};

export interface SplitSeriesAtNullGapsResult {
  mainSegments: Coordinate[][];
  leadingEdge: Coordinate[] | null;
  trailingEdge: Coordinate[] | null;
  interiorEdges: Coordinate[][];
}

/**
 * Splits a coordinate series at null-y gaps and produces dotted-line connectors:
 *
 * - **mainSegments** – contiguous runs of valid-y data points.
 * - **leadingEdge** – horizontal line from the range start to the first data point.
 * - **trailingEdge** – horizontal line from the last data point to the range end.
 * - **interiorEdges** – straight lines connecting the last point before a gap
 *   to the first point after it (rendered as dotted lines, hidden from tooltip).
 */
export function splitSeriesAtNullGaps(
  data: ReadonlyArray<Coordinate>
): SplitSeriesAtNullGapsResult {
  if (data.length === 0) {
    return { mainSegments: [], leadingEdge: null, trailingEdge: null, interiorEdges: [] };
  }

  let first = -1;
  let last = -1;
  for (let i = 0; i < data.length; i++) {
    if (isValidY(data[i].y)) {
      first = i;
      break;
    }
  }
  for (let i = data.length - 1; i >= 0; i--) {
    if (isValidY(data[i].y)) {
      last = i;
      break;
    }
  }

  if (first === -1 || last === -1) {
    return {
      mainSegments: [[...data]],
      leadingEdge: null,
      trailingEdge: null,
      interiorEdges: [],
    };
  }

  const yFirst = data[first].y as number;
  const yLast = data[last].y as number;

  const leadingEdge =
    first > 0
      ? [
          { x: data[0].x, y: yFirst },
          { x: data[first].x, y: yFirst },
        ]
      : null;

  const trailingEdge =
    last < data.length - 1
      ? [
          { x: data[last].x, y: yLast },
          { x: data[data.length - 1].x, y: yLast },
        ]
      : null;

  const mainSegments: Coordinate[][] = [];
  let currentSegment: Coordinate[] = [];

  for (let i = first; i <= last; i++) {
    if (isValidY(data[i].y)) {
      currentSegment.push(data[i]);
    } else if (currentSegment.length > 0) {
      mainSegments.push(currentSegment);
      currentSegment = [];
    }
  }
  if (currentSegment.length > 0) {
    mainSegments.push(currentSegment);
  }

  const interiorEdges: Coordinate[][] = [];
  for (let i = 0; i < mainSegments.length - 1; i++) {
    const prev = mainSegments[i];
    const next = mainSegments[i + 1];
    const lastPoint = prev[prev.length - 1];
    const nextPoint = next[0];
    interiorEdges.push([
      { x: lastPoint.x, y: lastPoint.y },
      { x: nextPoint.x, y: nextPoint.y },
    ]);
  }

  return { mainSegments, leadingEdge, trailingEdge, interiorEdges };
}

const EDGE_SERIES_TYPE = 'line' as const;

const AREA_NO_LINE_STYLE: RecursivePartial<AreaSeriesStyle> = {
  line: { visible: false },
  point: { opacity: 0, visible: 'never' },
};

function makeEdgeSeries(
  serie: TimeSeries<Coordinate>,
  id: string,
  data: Coordinate[]
): TimeSeries<Coordinate> {
  return {
    ...serie,
    id,
    title: id,
    type: EDGE_SERIES_TYPE,
    data,
    hideLegend: true,
    hideTooltipValue: true,
    lineSeriesStyle: APM_DOTTED_LINE_STYLE,
    markSizeAccessor: undefined,
  };
}

/**
 * Expands each line, linemark, or area series into optional dotted edge segments plus the main series.
 *
 * For **area** series the background fill is kept continuous across gaps by rendering
 * a single area with `fit: 'linear'` (tooltip hidden), then overlaying solid line
 * segments for real data and dotted connectors for gaps.
 *
 * For **line** series each contiguous data run becomes its own solid segment.
 *
 * Edge segments always render as `line` (no marks).
 * Bar series are unchanged. Stacked area charts should use {@link sliceTimeseriesToValidYRange} instead.
 */
export function expandTimeseriesWithDottedGapLines(
  timeseries: Array<TimeSeries<Coordinate>>
): Array<TimeSeries<Coordinate>> {
  const out: Array<TimeSeries<Coordinate>> = [];

  for (const serie of timeseries) {
    if (serie.type === 'bar' || !serie.data?.length) {
      out.push(serie);
      continue;
    }

    const { mainSegments, leadingEdge, trailingEdge, interiorEdges } = splitSeriesAtNullGaps(
      serie.data
    );
    const baseId = serie.id ?? serie.title;

    if (leadingEdge) {
      out.push(makeEdgeSeries(serie, `${baseId}__edge_leading`, leadingEdge));
    }

    if (trailingEdge) {
      out.push(makeEdgeSeries(serie, `${baseId}__edge_trailing`, trailingEdge));
    }

    interiorEdges.forEach((edge, i) => {
      out.push(makeEdgeSeries(serie, `${baseId}__edge_gap_${i}`, edge));
    });

    if (serie.type === 'area' && interiorEdges.length > 0) {
      out.push({
        ...serie,
        id: `${baseId}__area_fill`,
        title: `${baseId}__area_fill`,
        type: 'area',
        data: serie.data,
        fit: 'linear',
        hideLegend: true,
        hideTooltipValue: true,
        areaSeriesStyle: AREA_NO_LINE_STYLE,
        markSizeAccessor: undefined,
      });
    }

    mainSegments.forEach((segment, i) => {
      out.push({
        ...serie,
        id: i === 0 ? baseId : `${baseId}__seg_${i}`,
        type: serie.type === 'area' && mainSegments.length > 1 ? EDGE_SERIES_TYPE : serie.type,
        data: segment,
        hideLegend: i > 0,
      });
    });
  }

  return out;
}

/**
 * Trims leading/trailing null points without drawing dotted overlays. Use for stacked area charts where
 * per-series line segments would not align with stacking.
 */
export function sliceTimeseriesToValidYRange(
  timeseries: Array<TimeSeries<Coordinate>>
): Array<TimeSeries<Coordinate>> {
  const flattenSegments = (segments: Coordinate[][]): Coordinate[] =>
    segments.reduce<Coordinate[]>((acc, seg) => acc.concat(seg), []);

  return timeseries.map((serie) => ({
    ...serie,
    data: flattenSegments(splitSeriesAtNullGaps(serie.data).mainSegments),
  }));
}
