import type { FailedTransactionsCorrelation, FailedTransactionsCorrelationsImpactThreshold } from '../../../../../common/correlations/failed_transactions_correlations/types';
export declare function getFailedTransactionsCorrelationImpactLabel(pValue: FailedTransactionsCorrelation['pValue'], isFallbackResult?: boolean): {
    impact: FailedTransactionsCorrelationsImpactThreshold;
    color: string;
} | null;
export declare function getLatencyCorrelationImpactLabel(correlation: FailedTransactionsCorrelation['pValue'], isFallbackResult?: boolean): {
    impact: FailedTransactionsCorrelationsImpactThreshold;
    color: string;
} | null;
