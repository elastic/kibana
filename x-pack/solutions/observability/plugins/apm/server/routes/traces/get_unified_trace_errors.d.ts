import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import type { getUnprocessedOtelErrors } from './get_unprocessed_otel_errors';
import type { getApmTraceError } from './get_apm_trace_error';
export interface UnifiedTraceErrors {
    apmErrors: Awaited<ReturnType<typeof getApmTraceError>>;
    unprocessedOtelErrors: Awaited<ReturnType<typeof getUnprocessedOtelErrors>>;
    totalErrors: number;
}
export declare function getUnifiedTraceErrors({ apmEventClient, logsClient, traceId, docId, start, end, }: {
    apmEventClient: APMEventClient;
    logsClient: LogsClient;
    traceId: string;
    docId?: string;
    start: number;
    end: number;
}): Promise<UnifiedTraceErrors>;
