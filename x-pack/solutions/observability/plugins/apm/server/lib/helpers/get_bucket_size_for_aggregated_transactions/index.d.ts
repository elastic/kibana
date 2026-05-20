export declare function getBucketSizeForAggregatedTransactions({ start, end, numBuckets, searchAggregatedTransactions, searchAggregatedServiceMetrics, }: {
    start: number;
    end: number;
    numBuckets?: number;
    searchAggregatedTransactions?: boolean;
    searchAggregatedServiceMetrics?: boolean;
}): {
    bucketSize: number;
    intervalString: string;
};
