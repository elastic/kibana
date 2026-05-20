import type { EuiThemeComputed } from '@elastic/eui';
import type { HistogramItem } from '../../../../common/correlations/types';
import type { DurationDistributionChartData } from '../../shared/charts/duration_distribution_chart';
import type { LatencyCorrelation } from '../../../../common/correlations/latency_correlations/types';
import type { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';
export declare function getTransactionDistributionChartData({ euiTheme, allTransactionsHistogram, failedTransactionsHistogram, selectedTerm, }: {
    euiTheme: EuiThemeComputed;
    allTransactionsHistogram?: HistogramItem[];
    failedTransactionsHistogram?: HistogramItem[];
    selectedTerm?: LatencyCorrelation | FailedTransactionsCorrelation | undefined;
}): DurationDistributionChartData[];
