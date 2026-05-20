export declare function getBucketSize({ start, end, numBuckets, minBucketSize, }: {
    start: number;
    end: number;
    numBuckets?: number;
    minBucketSize?: number;
}): {
    bucketSize: number;
    intervalString: string;
};
