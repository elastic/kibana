import type { estypes } from '@elastic/elasticsearch';
import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export interface DurationFieldCandidatesResponse {
    fieldCandidates: string[];
}
export declare function fetchDurationFieldCandidates({ apmEventClient, eventType, start, end, }: CommonCorrelationsQueryParams & {
    query: estypes.QueryDslQueryContainer;
    apmEventClient: APMEventClient;
    eventType: ProcessorEvent;
}): Promise<DurationFieldCandidatesResponse>;
