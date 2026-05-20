import type { APIReturnType } from './create_call_apm_api';
type ErrorsByTraceId = APIReturnType<'GET /internal/apm/unified_traces/{traceId}/errors'>;
export declare const fetchErrorsByTraceId: ({ traceId, docId, start, end, }: {
    traceId: string;
    docId?: string;
    start: string;
    end: string;
}, signal: AbortSignal) => Promise<ErrorsByTraceId>;
export {};
