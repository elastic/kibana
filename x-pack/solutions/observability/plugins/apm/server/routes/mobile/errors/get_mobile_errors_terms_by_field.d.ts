import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export type MobileErrorTermsByFieldResponse = Array<{
    label: string;
    count: number;
}>;
export declare function getMobileErrorsTermsByField({ kuery, apmEventClient, serviceName, environment, start, end, size, fieldName, }: {
    kuery: string;
    apmEventClient: APMEventClient;
    serviceName: string;
    environment: string;
    start: number;
    end: number;
    size: number;
    fieldName: string;
}): Promise<MobileErrorTermsByFieldResponse>;
