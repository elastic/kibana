export declare function getMetricsDateHistogramParams({ start, end, metricsInterval, }: {
    start: number;
    end: number;
    metricsInterval: number;
}): {
    field: string;
    fixed_interval: string;
    min_doc_count: number;
    extended_bounds: {
        min: number;
        max: number;
    };
};
