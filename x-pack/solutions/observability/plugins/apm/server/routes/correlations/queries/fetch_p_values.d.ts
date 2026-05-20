import type { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';
import type { CommonCorrelationsQueryParams, EntityType } from '../../../../common/correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export interface PValuesResponse {
    failedTransactionsCorrelations: FailedTransactionsCorrelation[];
    ccsWarning: boolean;
    fallbackResult?: FailedTransactionsCorrelation;
}
export declare const fetchPValues: ({ apmEventClient, start, end, environment, kuery, query, durationMin, durationMax, fieldCandidates, entityType, includeHistogram, }: CommonCorrelationsQueryParams & {
    apmEventClient: APMEventClient;
    durationMin?: number;
    durationMax?: number;
    fieldCandidates: string[];
    entityType: EntityType;
    includeHistogram?: boolean;
}) => Promise<PValuesResponse>;
