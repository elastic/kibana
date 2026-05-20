export declare function useServiceAgentFetcher({ serviceName, start, end, }: {
    serviceName?: string;
    start: string;
    end: string;
}): {
    status: import("../../hooks/use_fetcher").FETCH_STATUS;
    error: import("@kbn/core/public").IHttpFetchError<import("@kbn/core/public").ResponseErrorBody> | undefined;
    agentName?: string;
    runtimeName?: string;
    runtimeVersion?: string;
    telemetrySdkName?: string;
    telemetrySdkLanguage?: string;
    serverlessType?: import("@kbn/apm-types").ServerlessType;
};
