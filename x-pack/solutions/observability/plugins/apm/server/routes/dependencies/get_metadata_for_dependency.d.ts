import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export interface MetadataForDependencyResponse {
    spanType: string | undefined;
    spanSubtype: string | undefined;
}
export declare function getMetadataForDependency({ apmEventClient, dependencyName, start, end, }: {
    apmEventClient: APMEventClient;
    dependencyName: string;
    start: number;
    end: number;
}): Promise<MetadataForDependencyResponse>;
