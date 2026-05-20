import type { estypes } from '@elastic/elasticsearch';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare const fetchDurationCorrelation: ({ apmEventClient, eventType, start, end, environment, kuery, query, expectations, ranges, fractions, totalDocCount, }: CommonCorrelationsQueryParams & {
    apmEventClient: APMEventClient;
    eventType: ProcessorEvent;
    expectations: number[];
    ranges: estypes.AggregationsAggregationRange[];
    fractions: number[];
    totalDocCount: number;
}) => Promise<{
    ranges: unknown[];
    correlation: number | null;
    ksTest: number | null;
}>;
