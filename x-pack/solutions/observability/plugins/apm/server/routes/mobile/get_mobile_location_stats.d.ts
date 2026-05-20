import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { Maybe } from '../../../typings/common';
export type Timeseries = Array<{
    x: number;
    y: number;
}>;
interface LocationStats {
    mostSessions: {
        location?: string;
        value: Maybe<number>;
        timeseries: Timeseries;
    };
    mostRequests: {
        location?: string;
        value: Maybe<number>;
        timeseries: Timeseries;
    };
    mostCrashes: {
        location?: string;
        value: Maybe<number>;
        timeseries: Timeseries;
    };
    mostLaunches: {
        location?: string;
        value: Maybe<number>;
        timeseries: Timeseries;
    };
}
export interface MobileLocationStats {
    currentPeriod: LocationStats;
    previousPeriod: LocationStats;
}
interface Props {
    kuery: string;
    apmEventClient: APMEventClient;
    serviceName: string;
    environment: string;
    start: number;
    end: number;
    locationField?: string;
    offset?: string;
}
export declare function getMobileLocationStatsPeriods({ kuery, apmEventClient, serviceName, environment, start, end, locationField, offset, }: Props): Promise<MobileLocationStats>;
export {};
