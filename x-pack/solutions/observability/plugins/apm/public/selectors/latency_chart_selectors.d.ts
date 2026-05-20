import type { LatencyAggregationType } from '../../common/latency_aggregation_types';
import type { APMChartSpec, Coordinate } from '../../typings/timeseries';
import type { APIReturnType } from '../services/rest/create_call_apm_api';
export type LatencyChartsResponse = APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>;
export interface LatencyChartData {
    currentPeriod?: APMChartSpec<Coordinate>;
    previousPeriod?: APMChartSpec<Coordinate>;
}
export declare function getLatencyChartSelector({ latencyChart, latencyAggregationType, previousPeriodLabel, }: {
    latencyChart?: LatencyChartsResponse;
    latencyAggregationType: LatencyAggregationType;
    previousPeriodLabel: string;
}): Partial<LatencyChartData>;
