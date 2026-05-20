import type { estypes } from '@elastic/elasticsearch';
import type { Environment } from '../../../common/environment_rt';
import type { EntityType } from '../../../common/correlations/types';
import type { OverallLatencyDistributionResponse } from './types';
import type { LatencyDistributionChartType } from '../../../common/latency_distribution_chart_types';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
type GetOverallLatencyDistributionParams = {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    environment: Environment;
    kuery: string;
    query: estypes.QueryDslQueryContainer;
    percentileThreshold: number;
    durationMinOverride?: number;
    durationMaxOverride?: number;
    isOtel?: boolean;
} & ({
    chartType: LatencyDistributionChartType;
    searchMetrics: boolean;
    entityType?: never;
} | {
    entityType: EntityType;
    chartType?: never;
    searchMetrics?: never;
});
export declare function getOverallLatencyDistribution({ chartType, entityType, apmEventClient, start, end, environment, kuery, query, percentileThreshold, durationMinOverride, durationMaxOverride, searchMetrics, isOtel, }: GetOverallLatencyDistributionParams): Promise<OverallLatencyDistributionResponse>;
export {};
