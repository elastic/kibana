interface Props {
    field: string;
    environment: string;
    start: string;
    end: string;
    kuery: string;
    comparisonEnabled: boolean;
    offset?: string;
}
export declare function useMobileStatisticsFetcher({ field, environment, start, end, kuery, comparisonEnabled, offset, }: Props): {
    mainStatistics: never[] | {
        name: string | number;
        latency: number | null;
        throughput: number;
        crashRate: number;
    }[];
    mainStatisticsStatus: import("../../../../../hooks/use_fetcher").FETCH_STATUS;
    detailedStatistics: {
        currentPeriod: {};
        previousPeriod: {};
    };
    detailedStatisticsStatus: import("../../../../../hooks/use_fetcher").FETCH_STATUS;
};
export {};
