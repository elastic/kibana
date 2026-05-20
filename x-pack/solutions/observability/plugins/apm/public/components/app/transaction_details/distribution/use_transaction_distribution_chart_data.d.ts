import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
export declare const useTransactionDistributionChartData: () => {
    totalDocCount: number | undefined;
    chartData: import("../../../shared/charts/duration_distribution_chart").DurationDistributionChartData[];
    hasData: boolean;
    percentileThresholdValue: number | null | undefined;
    status: FETCH_STATUS;
};
