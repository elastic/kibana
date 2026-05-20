export declare function mergeCountWithOther(buckets?: Array<{
    key: string | number;
    doc_count: number;
}>, otherCount?: number): {
    key: string | number;
    docCount: number;
}[];
