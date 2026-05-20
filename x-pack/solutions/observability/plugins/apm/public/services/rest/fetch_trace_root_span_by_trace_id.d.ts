import type { APIReturnType } from './create_call_apm_api';
type TraceRootSpan = APIReturnType<'GET /internal/apm/unified_traces/{traceId}/root_span'>;
export declare const fetchRootSpanByTraceId: ({ traceId, start, end, }: {
    traceId: string;
    start: string;
    end: string;
}, signal: AbortSignal) => Promise<TraceRootSpan | undefined>;
export {};
