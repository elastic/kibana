export declare function getAnomalyResultBucketSize({ start, end, minBucketSize, }: {
    start: number;
    end: number;
    minBucketSize?: number;
}): {
    bucketSize: number;
    intervalString: string;
};
