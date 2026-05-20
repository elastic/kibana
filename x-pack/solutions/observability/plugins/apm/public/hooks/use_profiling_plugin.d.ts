export declare function useProfilingPlugin(): {
    profilingLocators: {
        flamegraphLocator: import("../../../observability_shared/common").FlamegraphLocator;
        topNFunctionsLocator: import("../../../observability_shared/common").TopNFunctionsLocator;
        stacktracesLocator: import("../../../observability_shared/common").StacktracesLocator;
    } | undefined;
    isProfilingPluginInitialized: boolean | undefined;
    isProfilingAvailable: boolean | undefined;
    isLoading: boolean;
};
