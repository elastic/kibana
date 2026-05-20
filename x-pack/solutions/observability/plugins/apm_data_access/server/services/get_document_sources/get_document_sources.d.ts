import type { TimeRangeMetadata } from '../../../common/time_range_metadata';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export interface DocumentSourcesRequest {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    kuery: string;
}
export declare function getDocumentSources({ apmEventClient, start, end, kuery, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    kuery: string;
}): Promise<TimeRangeMetadata['sources']>;
