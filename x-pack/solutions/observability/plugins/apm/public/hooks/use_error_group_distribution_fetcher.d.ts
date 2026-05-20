export declare function useErrorGroupDistributionFetcher({ serviceName, groupId, kuery, environment, }: {
    serviceName: string;
    groupId: string | undefined;
    kuery: string;
    environment: string;
}): {
    errorDistributionData: import("../../server/routes/errors/distribution/get_distribution").ErrorDistributionResponse | undefined;
    errorDistributionStatus: import("./use_fetcher").FETCH_STATUS;
};
