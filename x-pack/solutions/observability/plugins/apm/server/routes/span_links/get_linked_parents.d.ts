import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getLinkedParentsOfSpan({ apmEventClient, traceId, spanId, start, end, processorEvent, }: {
    traceId: string;
    spanId: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    processorEvent?: ProcessorEvent;
}): Promise<import("@kbn/apm-types").SpanLink[]>;
