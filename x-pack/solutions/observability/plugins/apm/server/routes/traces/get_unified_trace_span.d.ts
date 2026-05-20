import type { UnifiedSpanDocument } from '@kbn/apm-types';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getUnifiedTraceSpan({ spanId, traceId, apmEventClient, start, end, fields, }: {
    spanId?: string;
    traceId: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    fields?: string[];
}): Promise<UnifiedSpanDocument | undefined>;
