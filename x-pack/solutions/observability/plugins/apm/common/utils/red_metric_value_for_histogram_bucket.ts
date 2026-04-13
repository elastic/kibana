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
 * For RED series from `date_histogram`: empty buckets at the **start or end** of the
 * selected range are often incomplete (no observation), not a measured zero — those
 * become `null` so charts do not dip to zero at the edges. Empty buckets **between**
 * non-empty buckets keep their computed values (e.g. true zero throughput).
 * Invalid values (`null`, `NaN`) are always dropped to `null`.
 *
 */
export function nullifyLeadingTrailingEmptyRedMetricPoints(
  points: ReadonlyArray<RedMetricHistogramPoint>
): Array<{ x: number; y: number | null }> {
  if (points.length === 0) {
    return [];
  }

  let firstNonEmpty = 0;
  while (firstNonEmpty < points.length && points[firstNonEmpty].docCount === 0) {
    firstNonEmpty++;
  }

  let lastNonEmpty = points.length - 1;
  while (lastNonEmpty >= 0 && points[lastNonEmpty].docCount === 0) {
    lastNonEmpty--;
  }

  return points.map((point, index) => {
    const isLeadingOrTrailingEmpty =
      point.docCount === 0 && (index < firstNonEmpty || index > lastNonEmpty);

    if (isLeadingOrTrailingEmpty) {
      return { x: point.x, y: null };
    }

    const y = point.y;
    if (y == null || Number.isNaN(y)) {
      return { x: point.x, y: null };
    }
    return { x: point.x, y };
  });
}
