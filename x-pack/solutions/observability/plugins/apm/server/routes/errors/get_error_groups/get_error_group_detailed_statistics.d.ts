import type { Coordinate } from '../../../../typings/timeseries';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
interface ErrorGroupDetailedStat {
    groupId: string;
    timeseries: Coordinate[];
}
export declare function getErrorGroupDetailedStatistics({ kuery, serviceName, apmEventClient, numBuckets, groupIds, environment, start, end, offset, }: {
    kuery: string;
    serviceName: string;
    apmEventClient: APMEventClient;
    numBuckets: number;
    groupIds: string[];
    environment: string;
    start: number;
    end: number;
    offset?: string;
}): Promise<ErrorGroupDetailedStat[]>;
export interface ErrorGroupPeriodsResponse {
    currentPeriod: Record<string, ErrorGroupDetailedStat>;
    previousPeriod: Record<string, ErrorGroupDetailedStat>;
}
export declare function getErrorGroupPeriods({ kuery, serviceName, apmEventClient, numBuckets, groupIds, environment, start, end, offset, }: {
    kuery: string;
    serviceName: string;
    apmEventClient: APMEventClient;
    numBuckets: number;
    groupIds: string[];
    environment: string;
    start: number;
    end: number;
    offset?: string;
}): Promise<ErrorGroupPeriodsResponse>;
export {};
