import type { estypes } from '@elastic/elasticsearch';
import type { CommonCorrelationsQueryParams, EntityType, FieldValuePair } from '../../../../common/correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function fetchDurationCorrelationWithHistogram({ apmEventClient, entityType, start, end, environment, kuery, query, expectations, ranges, fractions, histogramRangeSteps, totalDocCount, fieldValuePair, includeHistogram, }: CommonCorrelationsQueryParams & {
    apmEventClient: APMEventClient;
    entityType: EntityType;
    expectations: number[];
    ranges: estypes.AggregationsAggregationRange[];
    fractions: number[];
    histogramRangeSteps: number[];
    totalDocCount: number;
    fieldValuePair: FieldValuePair;
    includeHistogram?: boolean;
}): Promise<{
    correlation: number;
    ksTest: number;
    fieldName: string;
    fieldValue: string | number;
    isFallbackResult?: boolean;
} | {
    correlation: number;
    ksTest: number;
    histogram: {
        key: number;
        doc_count: number;
    }[];
    fieldName: string;
    fieldValue: string | number;
    isFallbackResult?: boolean;
} | undefined>;
