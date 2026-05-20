export declare function useTimeRangeMetadata({ start, end, kuery, }: {
    start: string;
    end: string;
    kuery: string;
}): import("../../hooks/use_fetcher").FetcherResult<import("../../../common/time_range_metadata").TimeRangeMetadata>;
