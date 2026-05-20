import type { Coordinate } from '../../../../typings/timeseries';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { APMConfig } from '../../..';
export declare function getActiveInstancesTimeseries({ environment, kuery, serviceName, start, end, serverlessId, config, apmEventClient, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    start: number;
    end: number;
    serverlessId?: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
}): Promise<Coordinate[]>;
