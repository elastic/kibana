import type { AggregationOptionsByType, AggregationResultOf } from '@kbn/es-types';
export declare const getColdstartAggregation: () => {
    terms: {
        field: string;
    };
};
type ColdstartAggregation = ReturnType<typeof getColdstartAggregation>;
export declare const getTimeseriesAggregation: (start: number, end: number, intervalString: string) => {
    date_histogram: {
        field: string;
        fixed_interval: string;
        min_doc_count: number;
        extended_bounds: {
            min: number;
            max: number;
        };
    };
    aggs: {
        coldstartStates: {
            terms: {
                field: string;
            };
        };
    };
};
export declare function calculateTransactionColdstartRate(coldstartStatesResponse: AggregationResultOf<ColdstartAggregation, {}>): number;
export declare function getTransactionColdstartRateTimeSeries(buckets: AggregationResultOf<{
    date_histogram: AggregationOptionsByType['date_histogram'];
    aggs: {
        coldstartStates: ColdstartAggregation;
    };
}, {}>['buckets']): {
    x: number;
    y: number;
}[];
export {};
