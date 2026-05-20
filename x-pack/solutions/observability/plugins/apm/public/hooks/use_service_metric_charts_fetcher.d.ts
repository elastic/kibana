export declare function useServiceMetricChartsFetcher({ serviceNodeName, kuery, environment, }: {
    serviceNodeName: string | undefined;
    kuery: string;
    environment: string;
}): {
    data: {
        charts: import("../../server/routes/metrics/fetch_and_transform_metrics").FetchAndTransformMetrics[];
    };
    status: import("./use_fetcher").FETCH_STATUS;
    error: import("@kbn/core/public").IHttpFetchError<import("@kbn/core/public").ResponseErrorBody> | undefined;
};
