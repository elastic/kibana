export declare function useCrashGroupDistributionFetcher({ serviceName, groupId, kuery, environment, }: {
    serviceName: string;
    groupId: string | undefined;
    kuery: string;
    environment: string;
}): {
    crashDistributionData: import("../../server/routes/mobile/crashes/distribution/get_distribution").CrashDistributionResponse | undefined;
    status: import("./use_fetcher").FETCH_STATUS;
};
