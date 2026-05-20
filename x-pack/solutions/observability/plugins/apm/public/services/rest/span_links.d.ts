import type { ProcessorEvent } from '@kbn/observability-plugin/common';
export declare const fetchSpanLinks: ({ traceId, docId, start, end, processorEvent, }: {
    traceId: string;
    docId: string;
    start: string;
    end: string;
    kuery?: string;
    processorEvent?: ProcessorEvent;
}, signal: AbortSignal) => Promise<{
    outgoingSpanLinks: import("@kbn/apm-types").SpanLinkDetails[];
    incomingSpanLinks: import("@kbn/apm-types").SpanLinkDetails[];
}>;
