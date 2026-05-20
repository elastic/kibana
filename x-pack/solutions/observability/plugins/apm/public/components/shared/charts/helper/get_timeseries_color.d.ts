export declare enum ChartType {
    LATENCY_AVG = 0,
    LATENCY_P95 = 1,
    LATENCY_P99 = 2,
    THROUGHPUT = 3,
    FAILED_TRANSACTION_RATE = 4,
    CPU_USAGE = 5,
    MEMORY_USAGE = 6,
    SESSIONS = 7,
    HTTP_REQUESTS = 8,
    ERROR_OCCURRENCES = 9,
    LOG_ERROR_RATE = 10,
    LOG_RATE = 11
}
export declare function getTimeSeriesColor(chartType: ChartType): {
    currentPeriodColor: string;
    previousPeriodColor: string;
};
