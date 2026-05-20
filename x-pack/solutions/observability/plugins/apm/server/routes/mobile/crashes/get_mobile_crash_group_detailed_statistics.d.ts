import type { Coordinate } from '../../../../typings/timeseries';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
interface CrashGroupDetailedStat {
    groupId: string;
    timeseries: Coordinate[];
}
export declare function getMobileCrashesGroupDetailedStatistics({ kuery, serviceName, apmEventClient, numBuckets, groupIds, environment, start, end, offset, }: {
    kuery: string;
    serviceName: string;
    apmEventClient: APMEventClient;
    numBuckets: number;
    groupIds: string[];
    environment: string;
    start: number;
    end: number;
    offset?: string;
}): Promise<CrashGroupDetailedStat[]>;
export interface MobileCrashesGroupPeriodsResponse {
    currentPeriod: Record<string, CrashGroupDetailedStat>;
    previousPeriod: Record<string, CrashGroupDetailedStat>;
}
export declare function getMobileCrashesGroupPeriods({ kuery, serviceName, apmEventClient, numBuckets, groupIds, environment, start, end, offset, }: {
    kuery: string;
    serviceName: string;
    apmEventClient: APMEventClient;
    numBuckets: number;
    groupIds: string[];
    environment: string;
    start: number;
    end: number;
    offset?: string;
}): Promise<MobileCrashesGroupPeriodsResponse>;
export {};
