import type { Error, Transaction } from '@kbn/apm-types';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { FETCH_STATUS } from '../../../hooks/use_fetcher';
export interface UnifiedWaterfallFetcherResult {
    traceItems: TraceItem[];
    errors: Error[];
    agentMarks: Record<string, number>;
    entryTransaction?: Transaction;
    traceDocsTotal: number;
    maxTraceItems: number;
    status: FETCH_STATUS;
}
export declare function useUnifiedWaterfallFetcher({ start, end, traceId, entryTransactionId, serviceName, }: {
    start: string;
    end: string;
    traceId?: string;
    entryTransactionId?: string;
    serviceName?: string;
}): {
    status: FETCH_STATUS;
    traceItems: TraceItem[];
    errors: Error[];
    agentMarks: Record<string, number>;
    entryTransaction?: Transaction;
    traceDocsTotal: number;
    maxTraceItems: number;
    _inspect?: import("../../../../../observability/typings/common").InspectResponse;
};
