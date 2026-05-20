import type { CommonCorrelationsQueryParams, EntityType } from '../../../../common/correlations/types';
import type { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare const fetchFailedEventsCorrelationPValues: ({ apmEventClient, start, end, environment, kuery, query, rangeSteps, fieldName, entityType, includeHistogram, }: CommonCorrelationsQueryParams & {
    apmEventClient: APMEventClient;
    rangeSteps: number[];
    fieldName: string;
    entityType: EntityType;
    includeHistogram?: boolean;
}) => Promise<FailedTransactionsCorrelation[]>;
