import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export interface ErrorGroupMainStatisticsResponse {
    errorGroups: Array<{
        groupId: string;
        name: string;
        lastSeen: number;
        occurrences: number;
        culprit: string | undefined;
        handled: boolean | undefined;
        type: string | undefined;
        traceId: string | undefined;
    }>;
    maxCountExceeded: boolean;
}
export declare function getErrorGroupMainStatistics({ kuery, serviceName, apmEventClient, environment, sortField, sortDirection, start, end, maxNumberOfErrorGroups, transactionName, transactionType, searchQuery, }: {
    kuery?: string;
    serviceName: string;
    apmEventClient: APMEventClient;
    environment?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    start: number;
    end: number;
    maxNumberOfErrorGroups?: number;
    transactionName?: string;
    transactionType?: string;
    searchQuery?: string;
}): Promise<ErrorGroupMainStatisticsResponse>;
