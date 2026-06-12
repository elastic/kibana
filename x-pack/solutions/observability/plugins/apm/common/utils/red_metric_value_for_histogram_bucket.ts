/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RedMetricHistogramPoint {
  x: number;
  docCount: number;
  y: number | null | undefined;
}

/**
 * For RED series from `date_histogram`:
 *
 * - Empty buckets (`docCount === 0`) become `null` so charts render a dotted
 *   line instead of dipping to zero when there is no data.
 * - Invalid values (`null`, `NaN`) are also dropped to `null`.
 */
export function nullifyEmptyRedMetricPoints(
  points: ReadonlyArray<RedMetricHistogramPoint>
): Array<{ x: number; y: number | null }> {
  return points.map((point) => {
    if (point.docCount === 0) {
      return { x: point.x, y: null };
    }

    const { y } = point;
    if (y == null || Number.isNaN(y)) {
      return { x: point.x, y: null };
    }
    return { x: point.x, y };
  });
}
