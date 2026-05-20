import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { Coordinate } from '../../../../typings/timeseries';
interface Props {
    apmEventClient: APMEventClient;
    serviceName: string;
    environment: string;
    start: number;
    end: number;
    kuery: string;
    offset?: string;
}
export interface MobileHttpErrorsTimeseries {
    currentPeriod: {
        timeseries: Coordinate[];
    };
    previousPeriod: {
        timeseries: Coordinate[];
    };
}
export declare function getMobileHttpErrors({ kuery, apmEventClient, serviceName, environment, start, end, offset, }: Props): Promise<MobileHttpErrorsTimeseries>;
export {};
