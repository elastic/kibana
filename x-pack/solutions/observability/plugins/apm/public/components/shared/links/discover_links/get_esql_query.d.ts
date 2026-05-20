import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
export type IndexType = 'traces' | 'error';
export interface ESQLQueryParams {
    kuery?: string;
    serviceName?: string;
    environment?: string;
    transactionName?: string;
    transactionType?: string;
    sampleRangeFrom?: number;
    sampleRangeTo?: number;
    dependencyName?: string;
    spanName?: string;
    spanId?: string;
    traceId?: string;
    errorGroupId?: string;
    errorId?: string;
    sortDirection?: 'ASC' | 'DESC';
}
export declare const getESQLQuery: ({ indexType, params, indexSettings, }: {
    indexType: IndexType;
    params: ESQLQueryParams;
    indexSettings: ApmIndexSettingsResponse["apmIndexSettings"];
}) => string | null;
