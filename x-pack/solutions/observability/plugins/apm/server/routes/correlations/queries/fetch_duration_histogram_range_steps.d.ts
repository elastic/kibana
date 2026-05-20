import type { CommonCorrelationsQueryParams, EntityType } from '../../../../common/correlations/types';
import type { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare const fetchDurationHistogramRangeSteps: ({ chartType, entityType, apmEventClient, start, end, environment, kuery, query, searchMetrics, durationMinOverride, durationMaxOverride, isOtel, }: CommonCorrelationsQueryParams & {
    chartType?: LatencyDistributionChartType;
    entityType?: EntityType;
    apmEventClient: APMEventClient;
    searchMetrics?: boolean;
    durationMinOverride?: number;
    durationMaxOverride?: number;
    isOtel?: boolean;
}) => Promise<{
    durationMin?: number;
    durationMax?: number;
    rangeSteps: number[];
}>;
