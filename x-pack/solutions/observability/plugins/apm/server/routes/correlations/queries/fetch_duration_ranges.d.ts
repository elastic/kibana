import type { estypes } from '@elastic/elasticsearch';
import type { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
import type { Environment } from '../../../../common/environment_rt';
import type { EntityType } from '../../../../common/correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare const fetchDurationRanges: ({ rangeSteps, apmEventClient, start, end, environment, kuery, query, chartType, entityType, searchMetrics, isOtel, }: {
    rangeSteps: number[];
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    environment: Environment;
    kuery: string;
    query: estypes.QueryDslQueryContainer;
    chartType?: LatencyDistributionChartType;
    entityType?: EntityType;
    searchMetrics?: boolean;
    isOtel?: boolean;
}) => Promise<{
    totalDocCount: number;
    durationRanges: Array<{
        key: number;
        doc_count: number;
    }>;
}>;
