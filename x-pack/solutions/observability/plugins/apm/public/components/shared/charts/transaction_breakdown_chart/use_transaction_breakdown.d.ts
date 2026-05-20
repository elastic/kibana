import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
export declare function useTransactionBreakdown({ kuery, environment, }: {
    kuery: string;
    environment: string;
}): {
    data: import("../../../../../server/routes/transactions/breakdown").TransactionBreakdownResponse | {
        timeseries: undefined;
    };
    status: FETCH_STATUS;
    error: import("@kbn/core/public").IHttpFetchError<import("@kbn/core/public").ResponseErrorBody> | undefined;
};
