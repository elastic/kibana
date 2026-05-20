import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export type ServerlessFunctionsOverviewResponse = Array<{
    serverlessId: string;
    serverlessFunctionName: string;
    serverlessDurationAvg: number | null;
    billedDurationAvg: number | null;
    coldStartCount: number | null;
    avgMemoryUsed: number | undefined;
    memorySize: number | null;
}>;
export declare function getServerlessFunctionsOverview({ end, environment, kuery, serviceName, start, apmEventClient, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    start: number;
    end: number;
    apmEventClient: APMEventClient;
}): Promise<ServerlessFunctionsOverviewResponse>;
