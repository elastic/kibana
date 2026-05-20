import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
export declare function getTraceSummaryCount({ apmEventClient, start, end, traceId, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    traceId: string;
}): Promise<{
    services: number;
    traceEvents: number;
}>;
