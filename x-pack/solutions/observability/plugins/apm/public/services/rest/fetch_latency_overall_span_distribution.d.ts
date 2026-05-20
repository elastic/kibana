export declare const fetchLatencyOverallSpanDistribution: ({ spanName, serviceName, start, end, isOtel, }: {
    spanName: string;
    serviceName: string;
    start: string;
    end: string;
    isOtel: boolean;
}, signal: AbortSignal) => Promise<import("../../../server/routes/latency_distribution/types").OverallLatencyDistributionResponse>;
