import type { LatencyCorrelationsResponse } from '../../../../../common/correlations/latency_correlations/types';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
export declare function getOverallHistogram(data: LatencyCorrelationsResponse, isRunning: boolean): {
    overallHistogram: import("@kbn/apm-types").HistogramItem[] | undefined;
    hasData: boolean;
    status: FETCH_STATUS;
};
