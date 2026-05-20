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
export declare function nullifyLeadingTrailingEmptyRedMetricPoints(points: ReadonlyArray<RedMetricHistogramPoint>): Array<{
    x: number;
    y: number | null;
}>;
