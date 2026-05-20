import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ApmDocumentType } from '../../../../common/document_type';
import type { APMEventClient } from '../create_es_client/create_apm_event_client';
export declare function getBackwardCompatibleDocumentTypeFilter(searchAggregatedTransactions: boolean): {
    bool: {
        filter: QueryDslQueryContainer[];
        must_not: QueryDslQueryContainer[];
    };
}[];
export declare function isDurationSummaryNotSupportedFilter(): QueryDslQueryContainer;
export declare function isSummaryFieldSupportedByDocType(typeOrSearchAgggregatedTransactions: ApmDocumentType.ServiceTransactionMetric | ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent | boolean): boolean;
export declare function getDurationFieldForTransactions(typeOrSearchAgggregatedTransactions: ApmDocumentType.ServiceTransactionMetric | ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent | boolean, useDurationSummaryField?: boolean): "transaction.duration.us" | "transaction.duration.histogram" | "transaction.duration.summary";
export declare function getHasTransactionsEvents({ start, end, apmEventClient, kuery, }: {
    start?: number;
    end?: number;
    apmEventClient: APMEventClient;
    kuery?: string;
}): Promise<boolean>;
