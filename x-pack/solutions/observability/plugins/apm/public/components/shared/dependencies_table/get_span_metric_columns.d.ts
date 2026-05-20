import type { FETCH_STATUS } from '../../../hooks/use_fetcher';
import type { Coordinate } from '../../../../typings/timeseries';
import type { ITableColumn } from '../managed_table';
export interface SpanMetricGroup {
    latency: number | null;
    throughput: number | null;
    failureRate: number | null;
    impact: number | null;
    currentStats: {
        latency?: Coordinate[];
        throughput?: Coordinate[];
        failureRate?: Coordinate[];
    } | undefined;
    previousStats: {
        latency?: Coordinate[];
        throughput?: Coordinate[];
        failureRate?: Coordinate[];
        impact?: number;
    } | undefined;
}
export declare function getSpanMetricColumns({ comparisonFetchStatus, shouldShowSparkPlots, }: {
    comparisonFetchStatus: FETCH_STATUS;
    shouldShowSparkPlots: boolean;
}): Array<ITableColumn<SpanMetricGroup>>;
