import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getSpanLinksCountById({ traceId, apmEventClient, start, end, }: {
    traceId: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<Record<string, number>>;
export declare function getLinkedChildrenOfSpan({ traceId, spanId, apmEventClient, start, end, }: {
    traceId: string;
    spanId: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<{
    trace: {
        id: string;
    };
    span: {
        id: string;
    };
}[]>;
