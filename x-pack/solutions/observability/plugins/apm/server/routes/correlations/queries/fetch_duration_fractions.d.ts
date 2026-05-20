import type { estypes } from '@elastic/elasticsearch';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
/**
 * Compute the actual percentile bucket counts and actual fractions
 */
export declare const fetchDurationFractions: ({ apmEventClient, eventType, start, end, environment, kuery, query, ranges, }: CommonCorrelationsQueryParams & {
    apmEventClient: APMEventClient;
    eventType: ProcessorEvent;
    ranges: estypes.AggregationsAggregationRange[];
}) => Promise<{
    fractions: number[];
    totalDocCount: number;
}>;
