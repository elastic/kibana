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
export declare function getErrorRateChartsForDependency({ apmEventClient, dependencyName, start, end, environment, kuery, searchServiceDestinationMetrics, spanName, offset, }: Options): Promise<{
    currentTimeseries: {
        x: number;
        y: number;
    }[];
    comparisonTimeseries: {
        x: number;
        y: number;
    }[] | null;
}>;
export {};
