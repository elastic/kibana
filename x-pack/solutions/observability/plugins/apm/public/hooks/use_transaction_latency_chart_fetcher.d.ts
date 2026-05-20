import type { LatencyAggregationType } from '../../common/latency_aggregation_types';
import { FETCH_STATUS } from './use_fetcher';
export declare function useTransactionLatencyChartsFetcher({ kuery, environment, transactionName, latencyAggregationType, }: {
    kuery: string;
    environment: string;
    transactionName: string | null;
    latencyAggregationType: LatencyAggregationType;
}): {
    bucketSizeInSeconds: number | undefined;
    start: string;
    end: string;
    latencyChartsData: Partial<import("../selectors/latency_chart_selectors").LatencyChartData>;
    latencyChartsStatus: FETCH_STATUS;
    latencyChartsError: import("@kbn/core/public").IHttpFetchError<import("@kbn/core/public").ResponseErrorBody> | undefined;
};
