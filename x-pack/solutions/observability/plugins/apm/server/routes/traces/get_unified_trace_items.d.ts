import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { TraceItem } from '../../../common/waterfall/unified_trace_item';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import { type UnifiedTraceErrors } from './get_unified_trace_errors';
export declare function getErrorsByDocId(unifiedTraceErrors: UnifiedTraceErrors): Record<string, {
    errorDocId: string;
    errorDocIndex?: string;
}[]>;
/**
 * Returns both APM documents and unprocessed OTEL spans
 */
export declare function getUnifiedTraceItems({ apmEventClient, logsClient, maxTraceItems, traceId, start, end, serviceName, ecsOnly, }: {
    apmEventClient: APMEventClient;
    logsClient: LogsClient;
    maxTraceItems: number;
    traceId: string;
    start: number;
    end: number;
    serviceName?: string;
    ecsOnly?: boolean;
}): Promise<{
    traceItems: TraceItem[];
    unifiedTraceErrors: UnifiedTraceErrors;
    agentMarks: Record<string, number>;
    traceDocsTotal: number;
}>;
export declare function getTraceItemIcon({ spanType, agentName, processorEvent, kind, }: {
    spanType?: string;
    agentName?: string;
    processorEvent?: ProcessorEvent;
    kind?: string;
}): "database" | "merge" | "globe" | undefined;
