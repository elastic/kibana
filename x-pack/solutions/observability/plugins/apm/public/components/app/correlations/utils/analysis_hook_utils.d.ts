import type { FailedTransactionsCorrelation } from '../../../../../common/correlations/failed_transactions_correlations/types';
import type { LatencyCorrelation } from '../../../../../common/correlations/latency_correlations/types';
export interface CorrelationsProgress {
    error?: string;
    isRunning: boolean;
    loaded: number;
}
export declare function getLatencyCorrelationsSortedByCorrelation(latencyCorrelations: LatencyCorrelation[]): LatencyCorrelation[];
export declare function getFailedTransactionsCorrelationsSortedByScore(failedTransactionsCorrelations: FailedTransactionsCorrelation[]): FailedTransactionsCorrelation[];
export declare const getInitialResponse: () => {
    ccsWarning: boolean;
    isRunning: boolean;
    loaded: number;
};
export declare const getReducer: <T>() => (prev: T, update: Partial<T>) => T;
