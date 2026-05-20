import type { Environment } from '../../../common/environment_rt';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export interface DependencyOperation {
    spanName: string;
    latency: number | null;
    throughput: number;
    failureRate: number | null;
    impact: number;
    timeseries: Record<'latency' | 'throughput' | 'failureRate', Array<{
        x: number;
        y: number | null;
    }>>;
}
export declare function getTopDependencyOperations({ apmEventClient, dependencyName, start, end, offset, environment, kuery, searchServiceDestinationMetrics, }: {
    apmEventClient: APMEventClient;
    dependencyName: string;
    start: number;
    end: number;
    offset?: string;
    environment: Environment;
    kuery: string;
    searchServiceDestinationMetrics: boolean;
}): Promise<DependencyOperation[]>;
