import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getStacktracesIdsField({ apmEventClient, start, end, environment, serviceName, transactionType, transactionName, kuery, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    environment: string;
    serviceName: string;
    transactionType: string;
    transactionName?: string;
    kuery?: string;
}): Promise<"transaction.profiler_stack_trace_ids" | "elastic.profiler_stack_trace_ids">;
