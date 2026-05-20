export declare function useEnvironmentSelect({ serviceName, start, end, }: {
    serviceName?: string;
    start: string;
    end: string;
}): {
    data: {
        terms: string[];
    } | undefined;
    searchStatus: import("../../../hooks/use_fetcher").FETCH_STATUS;
    onSearchChange: (value: string) => void;
};
