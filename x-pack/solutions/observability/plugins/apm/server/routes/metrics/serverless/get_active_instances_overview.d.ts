import type { Coordinate } from '../../../../typings/timeseries';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
interface ActiveInstanceTimeseries {
    serverlessDuration: Coordinate[];
    billedDuration: Coordinate[];
}
export interface ActiveInstanceOverview {
    activeInstanceName: string;
    serverlessId: string;
    serverlessFunctionName: string;
    timeseries: ActiveInstanceTimeseries;
    serverlessDurationAvg: number | null;
    billedDurationAvg: number | null;
    avgMemoryUsed?: number | null;
    memorySize: number | null;
}
export declare function getServerlessActiveInstancesOverview({ end, environment, kuery, serviceName, start, serverlessId, apmEventClient, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    start: number;
    end: number;
    serverlessId?: string;
    apmEventClient: APMEventClient;
}): Promise<ActiveInstanceOverview[]>;
export {};
