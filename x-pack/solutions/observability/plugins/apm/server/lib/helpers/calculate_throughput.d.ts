export declare function calculateThroughputWithRange({ start, end, value, }: {
    start: number;
    end: number;
    value: number;
}): number;
export declare function calculateThroughputWithInterval({ bucketSize, value, }: {
    bucketSize: number;
    value: number;
}): number;
export type ThroughputUnit = 'minute' | 'second';
export declare function getThroughputUnit(bucketSize: number): ThroughputUnit;
