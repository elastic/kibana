import { EventOutcome } from '../../../common/event_outcome';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
interface Options {
    dependencyNames: string[];
    searchServiceDestinationMetrics: boolean;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    environment: string;
    kuery: string;
    offset?: string;
    numBuckets: number;
}
interface Statistics {
    latency: Array<{
        x: number;
        y: number;
    }>;
    errorRate: Array<{
        x: number;
        y: number;
    }>;
    throughput: Array<{
        x: number;
        y: number | null;
    }>;
}
declare function fetchDependenciesTimeseriesStatistics({ dependencyNames, searchServiceDestinationMetrics, apmEventClient, start, end, environment, kuery, numBuckets, }: Options): Promise<({
    doc_count: number;
    key: string | number;
    key_as_string?: string;
} & import("@kbn/es-types").AggregationResultOfMap<{
    timeseries: {
        date_histogram: {
            field: string;
            fixed_interval: string;
            extended_bounds: {
                min: number;
                max: number;
            };
        };
        aggs: {
            failures: {
                filter: {
                    term: {
                        "event.outcome": EventOutcome;
                    };
                };
                aggs: {
                    total_count?: {
                        sum: {
                            field: string | undefined;
                        };
                    } | undefined;
                };
            };
            throughput: {
                rate: {
                    unit: "minute";
                    field?: string | undefined;
                };
            };
            total_count?: {
                sum: {
                    field: string | undefined;
                };
            } | undefined;
            latency_count?: {
                sum: {
                    field: string | undefined;
                };
            } | undefined;
            latency_sum: {
                sum: {
                    field: string;
                };
            };
        };
    };
}, import("@kbn/apm-types").MetricRaw | import("@kbn/apm-types").Span>)[]>;
export type DependenciesTimeseriesBuckes = Awaited<ReturnType<typeof fetchDependenciesTimeseriesStatistics>>;
export declare function parseDependenciesStats({ dependencies, offsetInMs, }: {
    dependencies: DependenciesTimeseriesBuckes;
    offsetInMs: number;
}): Record<string, Statistics>;
export interface DependenciesTimeseriesStatisticsResponse {
    currentTimeseries: Record<string, Statistics>;
    comparisonTimeseries: Record<string, Statistics> | null;
}
export declare function getDependenciesTimeseriesStatistics({ apmEventClient, dependencyNames, start, end, environment, kuery, searchServiceDestinationMetrics, offset, numBuckets, }: Options): Promise<DependenciesTimeseriesStatisticsResponse>;
export {};
