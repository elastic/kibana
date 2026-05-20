import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export interface ErrorGroupSampleIdsResponse {
    errorSampleIds: string[];
    occurrencesCount: number;
}
export declare function getErrorGroupSampleIds({ environment, kuery, serviceName, groupId, apmEventClient, start, end, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    groupId: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<ErrorGroupSampleIdsResponse>;
