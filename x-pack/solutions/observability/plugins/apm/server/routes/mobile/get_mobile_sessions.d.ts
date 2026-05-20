import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { Coordinate } from '../../../typings/timeseries';
import type { Maybe } from '../../../typings/common';
export interface SessionsTimeseries {
    currentPeriod: {
        timeseries: Coordinate[];
        value: Maybe<number>;
    };
    previousPeriod: {
        timeseries: Coordinate[];
        value: Maybe<number>;
    };
}
interface Props {
    apmEventClient: APMEventClient;
    serviceName: string;
    transactionName?: string;
    environment: string;
    start: number;
    end: number;
    kuery: string;
    offset?: string;
}
export declare function getMobileSessions({ kuery, apmEventClient, serviceName, transactionName, environment, start, end, offset, }: Props): Promise<SessionsTimeseries>;
export {};
