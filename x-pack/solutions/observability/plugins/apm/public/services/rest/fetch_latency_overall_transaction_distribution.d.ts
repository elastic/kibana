export declare const fetchLatencyOverallTransactionDistribution: ({ transactionName, transactionType, serviceName, start, end, }: {
    transactionName: string;
    transactionType: string;
    serviceName: string;
    start: string;
    end: string;
}, signal: AbortSignal) => Promise<import("../../../server/routes/latency_distribution/types").OverallLatencyDistributionResponse>;
