import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { AutoAbortedAPMClient } from '../services/rest/create_call_apm_api';
export declare enum FETCH_STATUS {
    LOADING = "loading",
    SUCCESS = "success",
    FAILURE = "failure",
    NOT_INITIATED = "not_initiated"
}
export declare const isNotInitiated: (fetchStatus: FETCH_STATUS) => fetchStatus is FETCH_STATUS.NOT_INITIATED;
export declare const isPending: (fetchStatus: FETCH_STATUS) => fetchStatus is FETCH_STATUS.LOADING | FETCH_STATUS.NOT_INITIATED;
export declare const isFailure: (fetchStatus: FETCH_STATUS) => fetchStatus is FETCH_STATUS.FAILURE;
export declare const isSuccess: (fetchStatus: FETCH_STATUS) => fetchStatus is FETCH_STATUS.SUCCESS;
export interface FetcherResult<Data> {
    data?: Data;
    status: FETCH_STATUS;
    error?: IHttpFetchError<ResponseErrorBody>;
}
type InferResponseType<TReturn> = Exclude<TReturn, undefined> extends Promise<infer TResponseType> ? TResponseType : unknown;
export declare function useFetcher<TReturn>(fn: (callApmApi: AutoAbortedAPMClient, signal: AbortSignal) => TReturn, fnDeps: any[], options?: {
    preservePreviousData?: boolean;
    showToastOnError?: boolean;
    skipTimeRangeRefreshUpdate?: boolean;
}): FetcherResult<InferResponseType<TReturn>> & {
    refetch: () => void;
};
export {};
