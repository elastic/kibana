import type { AggregationOptionsByType, AggregationResultOf } from '@kbn/es-types';
import { type OutcomeAggregation } from '@kbn/apm-data-access-plugin/server/utils';
export declare function getFailedTransactionRateTimeSeries(buckets: AggregationResultOf<{
    date_histogram: AggregationOptionsByType['date_histogram'];
    aggs: OutcomeAggregation;
}, {}>['buckets']): {
    x: number;
    y: number | null;
}[];
