import type { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';
export declare function useFailedTransactionsCorrelations(): {
    progress: {
        error: string | undefined;
        loaded: number;
        isRunning: boolean;
    };
    response: {
        ccsWarning: boolean;
        failedTransactionsCorrelations?: FailedTransactionsCorrelation[];
        percentileThresholdValue?: number | null;
        overallHistogram?: import("@kbn/apm-types").HistogramItem[];
        totalDocCount?: number;
        errorHistogram?: import("@kbn/apm-types").HistogramItem[];
        fallbackResult?: FailedTransactionsCorrelation;
    };
    startFetch: () => Promise<void>;
    cancelFetch: () => void;
};
