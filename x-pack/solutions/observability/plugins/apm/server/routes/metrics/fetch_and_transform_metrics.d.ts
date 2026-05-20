import type { Unionize } from 'utility-types';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AggregationOptionsByType } from '@kbn/es-types';
import type { APMEventClient, APMEventESSearchRequest } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { ChartBase } from './types';
import type { ChartType, Coordinate, YUnit } from '../../../typings/timeseries';
import type { APMConfig } from '../..';
type MetricsAggregationMap = Unionize<{
    min: AggregationOptionsByType['min'];
    max: AggregationOptionsByType['max'];
    sum: AggregationOptionsByType['sum'];
    avg: AggregationOptionsByType['avg'];
}>;
type MetricAggs = Record<string, MetricsAggregationMap>;
export type GenericMetricsRequest = APMEventESSearchRequest & {
    aggs: {
        timeseriesData: {
            date_histogram: AggregationOptionsByType['date_histogram'];
            aggs: MetricAggs;
        };
    } & MetricAggs;
};
export type GenericMetricsChart = FetchAndTransformMetrics;
export interface FetchAndTransformMetrics {
    title: string;
    key: string;
    yUnit: YUnit;
    series: Array<{
        title: string;
        key: string;
        type: ChartType;
        overallValue: number;
        data: Coordinate[];
    }>;
    description?: string;
}
export declare function fetchAndTransformMetrics<T extends MetricAggs>({ environment, kuery, config, apmEventClient, serviceName, serviceNodeName, start, end, chartBase, aggs, additionalFilters, operationName, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    serviceNodeName?: string;
    start: number;
    end: number;
    chartBase: ChartBase;
    aggs: T;
    additionalFilters?: QueryDslQueryContainer[];
    operationName: string;
}): Promise<FetchAndTransformMetrics>;
export {};
