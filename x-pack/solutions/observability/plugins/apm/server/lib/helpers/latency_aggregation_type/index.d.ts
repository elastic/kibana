import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
export declare function getLatencyAggregation(latencyAggregationType: LatencyAggregationType, field: string): {
    latency: {
        avg: {
            field: string;
        };
    } | {
        percentiles: {
            field: string;
            percents: number[];
        };
    };
};
export declare function getLatencyValue({ latencyAggregationType, aggregation, }: {
    latencyAggregationType: LatencyAggregationType;
    aggregation: {
        value: number | null;
    } | {
        values: Record<string, number | null>;
    };
}): number | null;
