/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LineSeriesStyle, RecursivePartial } from '@elastic/charts';
import type { Coordinate, TimeSeries } from '../../../../../typings/timeseries';

function isValidY(y: number | null | undefined): y is number {
  return y != null && !Number.isNaN(y);
}

/** Dotted stroke for leading/trailing “no observation” histogram buckets (y null on server). */
export const APM_EDGE_DOTTED_LINE_STYLE: RecursivePartial<LineSeriesStyle> = {
  line: {
    dash: [4, 4],
    strokeWidth: 1,
  },
  point: { opacity: 0, visible: 'never' },
};

export interface SplitCoordinateSeriesForEdgeDotsResult {
  main: Coordinate[];
  leadingEdge: Coordinate[] | null;
  trailingEdge: Coordinate[] | null;
}

/**
 * When the first/last buckets have no docs, the API returns `y: null` for those points.
 * The main line then starts/ends at the first/last real bucket; this adds horizontal
 * dotted segments from the range edge to that value so edges read as uncertain, not “to zero”.
 */
export function splitCoordinateSeriesForEdgeDots(
  data: ReadonlyArray<Coordinate>
): SplitCoordinateSeriesForEdgeDotsResult {
  if (data.length === 0) {
    return { main: [], leadingEdge: null, trailingEdge: null };
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
    return { main: [...data], leadingEdge: null, trailingEdge: null };
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

  return {
    main: data.slice(first, last + 1),
    leadingEdge,
    trailingEdge,
  };
}

const EDGE_SERIES_TYPE = 'line' as const;

/**
 * Expands each line, linemark, or area series into optional dotted edge segments plus the main series.
 * Edge segments always render as `line` (no marks); the main series keeps its original type (`area` stays area).
 * Bar series are unchanged (not applicable). Stacked area charts should use {@link sliceApmTimeseriesToValidYRange} instead.
 */
export function expandApmTimeseriesWithEdgeDottedLines(
  timeseries: Array<TimeSeries<Coordinate>>
): Array<TimeSeries<Coordinate>> {
  const out: Array<TimeSeries<Coordinate>> = [];

  for (const serie of timeseries) {
    if (serie.type === 'bar' || !serie.data?.length) {
      out.push(serie);
      continue;
    }

    const { main, leadingEdge, trailingEdge } = splitCoordinateSeriesForEdgeDots(serie.data);
    const baseId = serie.id ?? serie.title;

    if (leadingEdge) {
      out.push({
        ...serie,
        id: `${baseId}__edge_leading`,
        title: `${baseId}__edge_leading`,
        type: EDGE_SERIES_TYPE,
        data: leadingEdge,
        hideLegend: true,
        hideTooltipValue: true,
        lineSeriesStyle: APM_EDGE_DOTTED_LINE_STYLE,
        markSizeAccessor: undefined,
      });
    }

    if (trailingEdge) {
      out.push({
        ...serie,
        id: `${baseId}__edge_trailing`,
        title: `${baseId}__edge_trailing`,
        type: EDGE_SERIES_TYPE,
        data: trailingEdge,
        hideLegend: true,
        hideTooltipValue: true,
        lineSeriesStyle: APM_EDGE_DOTTED_LINE_STYLE,
        markSizeAccessor: undefined,
      });
    }

    out.push({
      ...serie,
      id: baseId,
      data: main,
    });
  }

  return out;
}

/**
 * Trims leading/trailing null points without drawing dotted overlays. Use for stacked area charts where
 * per-series line segments would not align with stacking.
 */
export function sliceApmTimeseriesToValidYRange(
  timeseries: Array<TimeSeries<Coordinate>>
): Array<TimeSeries<Coordinate>> {
  return timeseries.map((serie) => ({
    ...serie,
    data: splitCoordinateSeriesForEdgeDots(serie.data).main,
  }));
}
