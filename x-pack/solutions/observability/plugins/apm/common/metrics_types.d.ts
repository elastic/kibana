export interface IngestionTimeRange {
    from: number;
    to: number;
}
export interface IngestionTimeRanges {
    classicApm: IngestionTimeRange;
    otelNative: IngestionTimeRange;
}
