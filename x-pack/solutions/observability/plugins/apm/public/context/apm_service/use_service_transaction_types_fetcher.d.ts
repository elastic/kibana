import type { RollupInterval } from '../../../common/rollup';
import type { ApmTransactionDocumentType } from '../../../common/document_type';
export declare function useServiceTransactionTypesFetcher({ serviceName, start, end, documentType, rollupInterval, }: {
    serviceName?: string;
    start?: string;
    end?: string;
    documentType?: ApmTransactionDocumentType;
    rollupInterval?: RollupInterval;
}): {
    transactionTypes: string[];
    status: import("../../hooks/use_fetcher").FETCH_STATUS;
};
