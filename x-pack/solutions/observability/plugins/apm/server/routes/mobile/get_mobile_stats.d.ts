import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { Maybe } from '../../../typings/common';
export interface Timeseries {
    x: number;
    y: number;
}
interface MobileStats {
    sessions: {
        timeseries: Timeseries[];
        value: Maybe<number>;
    };
    requests: {
        timeseries: Timeseries[];
        value: Maybe<number>;
    };
    crashRate: {
        timeseries: Timeseries[];
        value: Maybe<number>;
    };
    launchTimes: {
        timeseries: Timeseries[];
        value: Maybe<number>;
    };
}
export interface MobilePeriodStats {
    currentPeriod: MobileStats;
    previousPeriod: MobileStats;
}
interface Props {
    kuery: string;
    apmEventClient: APMEventClient;
    serviceName: string;
    environment: string;
    start: number;
    end: number;
    offset?: string;
}
export declare function getMobileStatsPeriods({ kuery, apmEventClient, serviceName, environment, start, end, offset, }: Props): Promise<MobilePeriodStats>;
export {};
