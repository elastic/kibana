export declare function useSearchServiceDestinationMetrics({ start, end, kuery, }: {
    start: string;
    end: string;
    kuery: string;
}): {
    isTimeRangeMetadataLoading: boolean;
    searchServiceDestinationMetrics: boolean;
};
