export declare function useServiceMixedIngestionFetcher({ serviceName, environment, kuery, start, end, }: {
    serviceName: string;
    environment: string;
    kuery: string;
    start: string;
    end: string;
}): {
    data: import("../../server/routes/services/get_service_mixed_ingestion").ServiceMixedIngestionResponse | undefined;
    status: import("./use_fetcher").FETCH_STATUS;
    error: import("@kbn/core/public").IHttpFetchError<import("@kbn/core/public").ResponseErrorBody> | undefined;
};
