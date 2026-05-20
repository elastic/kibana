import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getSuggestionsWithTermsAggregation({ fieldName, fieldValue, searchAggregatedTransactions, serviceName, apmEventClient, size, start, end, }: {
    fieldName: string;
    fieldValue: string;
    searchAggregatedTransactions: boolean;
    serviceName?: string;
    apmEventClient: APMEventClient;
    size: number;
    start: number;
    end: number;
}): Promise<{
    terms: string[];
}>;
