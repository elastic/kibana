import type { ApmDataSourceWithSummary } from '../../common/data_source';
import type { ApmDocumentType } from '../../common/document_type';
/**
 * Hook to get the source and interval based on Time Range Metadata API
 *
 * @param {number} numBuckets - The number of buckets. Should be 20 for SparkPlots or 100 for Other charts.

 */
export declare function usePreferredDataSourceAndBucketSize<TDocumentType extends ApmDocumentType.ServiceTransactionMetric | ApmDocumentType.TransactionMetric>({ start, end, kuery, numBuckets, type, }: {
    start: string;
    end: string;
    kuery: string;
    numBuckets: 20 | 100;
    type: TDocumentType;
}): {
    bucketSizeInSeconds: number;
    source: ApmDataSourceWithSummary<TDocumentType extends ApmDocumentType.ServiceTransactionMetric ? ApmDocumentType.ServiceTransactionMetric | ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent : ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent>;
} | null;
