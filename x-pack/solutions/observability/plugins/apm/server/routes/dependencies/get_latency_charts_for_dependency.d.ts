import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
interface Options {
    dependencyName: string;
    spanName: string;
    searchServiceDestinationMetrics: boolean;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    environment: string;
    kuery: string;
    offset?: string;
}
export interface LatencyChartsDependencyResponse {
    currentTimeseries: Array<{
        x: number;
        y: number;
    }>;
    comparisonTimeseries: Array<{
        x: number;
        y: number;
    }> | null;
}
export declare function getLatencyChartsForDependency({ apmEventClient, dependencyName, start, end, environment, kuery, searchServiceDestinationMetrics, spanName, offset, }: Options): Promise<LatencyChartsDependencyResponse>;
export {};
