import type { CommonCorrelationsQueryParams, EntityType } from '../../../common/correlations/types';
import type { LatencyDistributionChartType } from '../../../common/latency_distribution_chart_types';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getPercentileThresholdValue({ apmEventClient, chartType, entityType, start, end, environment, kuery, query, percentileThreshold, searchMetrics, isOtel, }: CommonCorrelationsQueryParams & {
    apmEventClient: APMEventClient;
    chartType?: LatencyDistributionChartType;
    entityType?: EntityType;
    percentileThreshold: number;
    searchMetrics?: boolean;
    isOtel?: boolean;
}): Promise<number>;
