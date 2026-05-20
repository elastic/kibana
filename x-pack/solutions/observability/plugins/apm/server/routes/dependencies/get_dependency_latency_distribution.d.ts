import type { Environment } from '../../../common/environment_rt';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { OverallLatencyDistributionResponse } from '../latency_distribution/types';
export interface DependencyLatencyDistributionResponse {
    allSpansDistribution: OverallLatencyDistributionResponse;
    failedSpansDistribution: OverallLatencyDistributionResponse;
}
export declare function getDependencyLatencyDistribution({ apmEventClient, dependencyName, spanName, kuery, environment, start, end, percentileThreshold, }: {
    apmEventClient: APMEventClient;
    dependencyName: string;
    spanName: string;
    kuery: string;
    environment: Environment;
    start: number;
    end: number;
    percentileThreshold: number;
}): Promise<DependencyLatencyDistributionResponse>;
