import type { LatencyCorrelation } from '../../../../common/correlations/latency_correlations/types';
export declare function useLatencyCorrelations(): {
    progress: {
        error: string | undefined;
        loaded: number;
        isRunning: boolean;
    };
    response: {
        ccsWarning: boolean;
        totalDocCount?: number;
        overallHistogram?: import("@kbn/apm-types/src/correlations").HistogramItem[];
        percentileThresholdValue?: number | null;
        latencyCorrelations?: LatencyCorrelation[];
    };
    startFetch: () => Promise<void>;
    cancelFetch: () => void;
};
