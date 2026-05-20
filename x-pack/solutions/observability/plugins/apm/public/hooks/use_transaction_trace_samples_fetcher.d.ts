export type TraceSamplesFetchResult = ReturnType<typeof useTransactionTraceSamplesFetcher>;
export declare function useTransactionTraceSamplesFetcher({ transactionName, kuery, environment, rangeFrom, rangeTo, }: {
    transactionName: string | undefined;
    kuery: string;
    environment: string;
    rangeFrom: string;
    rangeTo: string;
}): {
    data: import("../../server/routes/transactions/trace_samples").TransactionTraceSamplesResponse | undefined;
    status: import("./use_fetcher").FETCH_STATUS;
    error: import("@kbn/core/public").IHttpFetchError<import("@kbn/core/public").ResponseErrorBody> | undefined;
};
