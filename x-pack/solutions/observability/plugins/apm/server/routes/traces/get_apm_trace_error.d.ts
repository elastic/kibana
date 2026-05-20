import { type Error } from '@kbn/apm-types';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getApmTraceError(params: {
    apmEventClient: APMEventClient;
    traceId: string;
    docId?: string;
    start: number;
    end: number;
}): Promise<Error[]>;
