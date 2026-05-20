import type { estypes } from '@elastic/elasticsearch';
export declare const computeExpectationsAndRanges: (percentiles: number[], step?: number) => {
    expectations: number[];
    ranges: estypes.AggregationsAggregationRange[];
};
