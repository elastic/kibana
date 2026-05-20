import type { ApmDataSourceWithSummary } from '../data_source';
export declare function intervalToSeconds(rollupInterval: string): number;
export declare function getPreferredBucketSizeAndDataSource({ sources, bucketSizeInSeconds, }: {
    sources: ApmDataSourceWithSummary[];
    bucketSizeInSeconds: number;
}): {
    source: ApmDataSourceWithSummary;
    bucketSizeInSeconds: number;
};
