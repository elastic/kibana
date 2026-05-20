import type { LineSeriesStyle, RecursivePartial } from '@elastic/charts';
import type { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
/** Dotted stroke for leading/trailing “no observation” histogram buckets (y null on server). */
export declare const APM_EDGE_DOTTED_LINE_STYLE: RecursivePartial<LineSeriesStyle>;
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
export declare function splitCoordinateSeriesForEdgeDots(data: ReadonlyArray<Coordinate>): SplitCoordinateSeriesForEdgeDotsResult;
/**
 * Expands each line, linemark, or area series into optional dotted edge segments plus the main series.
 * Edge segments always render as `line` (no marks); the main series keeps its original type (`area` stays area).
 * Bar series are unchanged (not applicable). Stacked area charts should use {@link sliceApmTimeseriesToValidYRange} instead.
 */
export declare function expandApmTimeseriesWithEdgeDottedLines(timeseries: Array<TimeSeries<Coordinate>>): Array<TimeSeries<Coordinate>>;
/**
 * Trims leading/trailing null points without drawing dotted overlays. Use for stacked area charts where
 * per-series line segments would not align with stacking.
 */
export declare function sliceApmTimeseriesToValidYRange(timeseries: Array<TimeSeries<Coordinate>>): Array<TimeSeries<Coordinate>>;
