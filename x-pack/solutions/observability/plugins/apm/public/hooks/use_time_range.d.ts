interface TimeRange {
    start: string;
    end: string;
    refreshTimeRange: () => void;
    timeRangeId: number;
}
type PartialTimeRange = Pick<TimeRange, 'refreshTimeRange' | 'timeRangeId'> & Pick<Partial<TimeRange>, 'start' | 'end'>;
export declare function useTimeRange(range: {
    rangeFrom?: string;
    rangeTo?: string;
    optional: true;
}): PartialTimeRange;
export declare function useTimeRange(range: {
    rangeFrom: string;
    rangeTo: string;
}): TimeRange;
export {};
