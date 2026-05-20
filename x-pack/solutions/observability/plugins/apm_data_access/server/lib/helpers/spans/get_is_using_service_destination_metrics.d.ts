export declare function getDocumentTypeFilterForServiceDestinationStatistics(searchServiceDestinationMetrics: boolean): {
    bool: {
        filter: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[];
        must_not: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[];
    };
}[];
