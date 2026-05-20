import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { FieldValuePair, CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export interface FieldValuePairsResponse {
    fieldValuePairs: FieldValuePair[];
    errors: any[];
}
export declare const fetchFieldValuePairs: ({ apmEventClient, fieldCandidates, eventType, start, end, environment, kuery, query, }: CommonCorrelationsQueryParams & {
    apmEventClient: APMEventClient;
    fieldCandidates: string[];
    eventType: ProcessorEvent;
}) => Promise<{
    fieldValuePairs: FieldValuePair[];
    errors: any[];
}>;
