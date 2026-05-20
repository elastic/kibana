export declare const fetchSpan: ({ traceId, spanId, start, end, }: {
    traceId: string;
    spanId: string;
    start: string;
    end: string;
}, signal: AbortSignal) => Promise<import("@kbn/apm-types").UnifiedSpanDocument | undefined>;
