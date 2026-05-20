export declare function getOffsetInMs({ start, end, offset, }: {
    start: number;
    end: number;
    offset?: string;
}): {
    startWithOffset: number;
    endWithOffset: number;
    offsetInMs: number;
};
