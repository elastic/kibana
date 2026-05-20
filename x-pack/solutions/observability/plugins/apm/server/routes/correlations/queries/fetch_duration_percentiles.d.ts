import type { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import type { CommonCorrelationsQueryParams, EntityType } from '../../../../common/correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare const fetchDurationPercentiles: ({ chartType, entityType, apmEventClient, start, end, environment, kuery, query, percents, searchMetrics, isOtel, }: CommonCorrelationsQueryParams & {
    chartType?: LatencyDistributionChartType;
    entityType?: EntityType;
    apmEventClient: APMEventClient;
    percents?: number[];
    searchMetrics?: boolean;
    isOtel?: boolean;
}) => Promise<{
    totalDocs: number;
    percentiles: Record<string, number>;
}>;
