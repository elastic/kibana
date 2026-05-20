import type { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
export type MobileCrashGroupMainStatisticsResponse = Array<{
    groupId: string;
    name: string;
    lastSeen: number;
    occurrences: number;
    culprit: string | undefined;
    handled: boolean | undefined;
    type: string | undefined;
}>;
export declare function getMobileCrashGroupMainStatistics({ kuery, serviceName, apmEventClient, environment, sortField, sortDirection, start, end, maxNumberOfErrorGroups, transactionName, transactionType, }: {
    kuery: string;
    serviceName: string;
    apmEventClient: APMEventClient;
    environment: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    start: number;
    end: number;
    maxNumberOfErrorGroups?: number;
    transactionName?: string;
    transactionType?: string;
}): Promise<MobileCrashGroupMainStatisticsResponse>;
