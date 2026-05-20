export declare function useFiltersForEmbeddableCharts({ serviceName, environment, }: {
    serviceName: string;
    environment: string;
}): {
    meta: {};
    query: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer;
}[];
