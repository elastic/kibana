import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
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
export declare function getSessionsByLocation({ kuery, apmEventClient, serviceName, environment, start, end, locationField, offset, }: Props): Promise<{
    location: string;
    value: number;
    timeseries: {
        x: number;
        y: number;
    }[];
}>;
export {};
