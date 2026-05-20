import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { CommonCorrelationsQueryParams, FieldValuePair } from '../../../../../common/correlations/types';
import type { FieldValueFieldStats } from '../../../../../common/correlations/field_stats_types';
import type { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
export declare const fetchFieldValueFieldStats: ({ apmEventClient, eventType, start, end, environment, kuery, query, field, samplerShardSize, }: CommonCorrelationsQueryParams & {
    eventType: ProcessorEvent;
    apmEventClient: APMEventClient;
    field: FieldValuePair;
    samplerShardSize?: number;
}) => Promise<FieldValueFieldStats>;
