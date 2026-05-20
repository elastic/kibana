import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { APMConfig } from '../../..';
import type { APMEventClient } from '../create_es_client/create_apm_event_client';
export { getBackwardCompatibleDocumentTypeFilter, isSummaryFieldSupportedByDocType, getDurationFieldForTransactions, } from '@kbn/apm-data-access-plugin/server/utils';
export declare function getSearchTransactionsEvents({ config, start, end, apmEventClient, kuery, }: {
    config: APMConfig;
    start?: number;
    end?: number;
    apmEventClient: APMEventClient;
    kuery?: string;
}): Promise<boolean>;
export declare function getProcessorEventForTransactions(searchAggregatedTransactions: boolean): ProcessorEvent.metric | ProcessorEvent.transaction;
export declare function isRootTransaction(searchAggregatedTransactions: boolean): {
    term: {
        "transaction.root": boolean;
    };
    bool?: undefined;
} | {
    bool: {
        must_not: {
            exists: {
                field: string;
            };
        };
    };
    term?: undefined;
};
export declare function isDurationSummaryNotSupportedFilter(): QueryDslQueryContainer;
