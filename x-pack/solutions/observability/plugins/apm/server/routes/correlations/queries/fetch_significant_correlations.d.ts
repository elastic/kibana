import type { LatencyCorrelation } from '../../../../common/correlations/latency_correlations/types';
import type { CommonCorrelationsQueryParams, EntityType, FieldValuePair } from '../../../../common/correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export interface SignificantCorrelationsResponse {
    latencyCorrelations: LatencyCorrelation[];
    ccsWarning: boolean;
    totalDocCount: number;
    fallbackResult?: LatencyCorrelation;
}
export declare const fetchSignificantCorrelations: ({ apmEventClient, start, end, environment, kuery, query, durationMinOverride, durationMaxOverride, fieldValuePairs, entityType, includeHistogram, }: CommonCorrelationsQueryParams & {
    apmEventClient: APMEventClient;
    durationMinOverride?: number;
    durationMaxOverride?: number;
    fieldValuePairs: FieldValuePair[];
    entityType: EntityType;
    includeHistogram?: boolean;
}) => Promise<SignificantCorrelationsResponse>;
