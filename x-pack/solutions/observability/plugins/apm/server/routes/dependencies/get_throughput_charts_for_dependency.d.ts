import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
interface Options {
    dependencyName: string;
    spanName: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    environment: string;
    kuery: string;
    searchServiceDestinationMetrics: boolean;
    offset?: string;
}
export interface ThroughputChartsForDependencyResponse {
    currentTimeseries: Array<{
        x: number;
        y: number | null;
    }>;
    comparisonTimeseries: Array<{
        x: number;
        y: number | null;
    }> | null;
}
export declare function getThroughputChartsForDependency({ dependencyName, spanName, apmEventClient, start, end, environment, kuery, searchServiceDestinationMetrics, offset, }: Options): Promise<ThroughputChartsForDependencyResponse>;
export {};
