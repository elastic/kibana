import type { ApmFetchDataResponse, FetchDataParams } from '@kbn/observability-plugin/public';
export declare const fetchObservabilityOverviewPageData: ({ absoluteTime, relativeTime, bucketSize, intervalString, }: FetchDataParams) => Promise<ApmFetchDataResponse>;
export declare function getHasData(): Promise<import("../../../server/routes/observability_overview/has_data").HasDataResponse>;
