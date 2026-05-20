import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { Coordinate } from '../../../typings/timeseries';
interface MobileDetailedStatistics {
    fieldName: string;
    latency: Coordinate[];
    throughput: Coordinate[];
}
export interface MobileDetailedStatisticsResponse {
    currentPeriod: Record<string, MobileDetailedStatistics>;
    previousPeriod: Record<string, MobileDetailedStatistics>;
}
interface Props {
    kuery: string;
    apmEventClient: APMEventClient;
    serviceName: string;
    environment: string;
    start: number;
    end: number;
    field: string;
    fieldValues: string[];
    offset?: string;
}
export declare function getMobileDetailedStatisticsByFieldPeriods({ environment, kuery, serviceName, field, fieldValues, apmEventClient, start, end, offset, }: Props): Promise<MobileDetailedStatisticsResponse>;
export {};
