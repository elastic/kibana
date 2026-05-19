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
 * - **Leading** empty buckets (before the first bucket with data) become `null`
 *   so charts show a dotted line instead of dipping to zero at the start.
 * - **Trailing** empty buckets **in the past** (after the last bucket with data
 *   but before `cutoffDate`) are kept as `y: 0` — the service genuinely dropped to
 *   zero (e.g. catastrophic failure) and users must see this.
 * - **Trailing** empty buckets **in the future** (timestamp >= `cutoffDate`) become
 *   `null` — no observation is available yet, shown as a dotted line.
 *
 * Invalid values (`null`, `NaN`) are always dropped to `null`.
 *
 * @param cutoffDate - epoch ms cutoff; buckets at or after this timestamp are
 *   considered "future". Defaults to `Date.now()`.
 */
export function nullifyLeadingTrailingEmptyRedMetricPoints(
  points: ReadonlyArray<RedMetricHistogramPoint>,
  cutoffDate: number | undefined = Date.now()
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
    const isLeadingEmpty = point.docCount === 0 && index < firstNonEmpty;
    const isTrailingEmpty = point.docCount === 0 && index > lastNonEmpty;
    const isFutureTrailingEmpty = isTrailingEmpty && cutoffDate && point.x >= cutoffDate;

    if (isLeadingEmpty || isFutureTrailingEmpty) {
      return { x: point.x, y: null };
    }

    const y = point.y;
    if (y == null || Number.isNaN(y)) {
      return { x: point.x, y: null };
    }
    return { x: point.x, y };
  });
}
