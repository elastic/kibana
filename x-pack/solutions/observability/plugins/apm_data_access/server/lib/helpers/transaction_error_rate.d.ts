import type { AggregationsSumAggregation, AggregationsValueCountAggregation, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AggregationResultOfMap } from '@kbn/es-types';
import { ApmDocumentType } from '../../../common/document_type';
export declare const getOutcomeAggregation: (documentType: ApmDocumentType) => {
    successful_or_failed: {
        value_count: AggregationsValueCountAggregation;
    } | {
        filter: QueryDslQueryContainer;
    };
    successful: {
        sum: AggregationsSumAggregation;
    } | {
        filter: QueryDslQueryContainer;
    };
};
export type OutcomeAggregation = ReturnType<typeof getOutcomeAggregation>;
export declare function calculateFailedTransactionRate(outcomeResponse: AggregationResultOfMap<OutcomeAggregation, {}>): number;
