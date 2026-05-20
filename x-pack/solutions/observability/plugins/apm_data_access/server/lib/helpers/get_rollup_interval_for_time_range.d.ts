import type { RollupInterval } from '../../../common/rollup';
/**
 * Returns the appropriate rollup interval based on the time range.
 * Longer time ranges can tolerate more data delay in exchange for faster queries.
 * - Time range > 3 days: use 60m rollup (data delayed up to 60 min)
 * - Time range > 12 hours: use 10m rollup (data delayed up to 10 min)
 * - Otherwise: use 1m rollup (data delayed up to 1 min)
 */
export declare function getRollupIntervalForTimeRange(startMs: number, endMs: number): RollupInterval;
