import { type TimeRangeMetadata } from '../../../common';
import type { ApmDocumentType } from '../../../common/document_type';
export interface GetDocumentTypeParams {
    start: number;
    end: number;
    documentSources: TimeRangeMetadata['sources'];
    documentTypes: ApmDocumentType[];
    numBuckets?: number;
}
export declare function getDocumentTypeConfig({ start, end, numBuckets, documentTypes, documentSources, }: GetDocumentTypeParams): {
    preferredSource: {
        source: import("../../../common").ApmDataSourceWithSummary;
        bucketSizeInSeconds: number;
    };
    documentTypeConfig: {
        readonly processorEvent: import("@kbn/apm-types-shared").ProcessorEvent.metric;
        readonly metricsetName: "service_transaction";
        readonly getQuery: (rollupInterval: import("../../../common").RollupInterval) => {
            bool: {
                filter: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[];
            };
        };
        readonly rollupIntervals: import("../../../common").RollupInterval[];
    } | {
        readonly processorEvent: import("@kbn/apm-types-shared").ProcessorEvent.metric;
        readonly metricsetName: "service_summary";
        readonly getQuery: (rollupInterval: import("../../../common").RollupInterval) => {
            bool: {
                filter: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[];
            };
        };
        readonly rollupIntervals: import("../../../common").RollupInterval[];
    } | {
        readonly processorEvent: import("@kbn/apm-types-shared").ProcessorEvent.metric;
        readonly metricsetName: "transaction";
        readonly getQuery: (rollupInterval: import("../../../common").RollupInterval) => {
            bool: {
                filter: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[] | {
                    bool: {
                        filter: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[];
                        must_not: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[];
                    };
                }[];
            };
        };
        readonly rollupIntervals: import("../../../common").RollupInterval[];
    } | {
        readonly processorEvent: import("@kbn/apm-types-shared").ProcessorEvent.transaction;
        readonly rollupIntervals: readonly [import("../../../common").RollupInterval.None];
    } | {
        readonly processorEvent: import("@kbn/apm-types-shared").ProcessorEvent.metric;
        readonly metricsetName: "service_destination";
        readonly rollupIntervals: import("../../../common").RollupInterval[];
        readonly getQuery: (rollupInterval: import("../../../common").RollupInterval) => {
            bool: {
                filter: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[] | {
                    bool: {
                        filter: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[];
                        must_not: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[];
                    };
                }[];
            };
        };
    } | {
        readonly processorEvent: import("@kbn/apm-types-shared").ProcessorEvent.error;
        readonly rollupIntervals: readonly [import("../../../common").RollupInterval.None];
    } | {
        readonly processorEvent: import("@kbn/apm-types-shared").ProcessorEvent.span;
        readonly rollupIntervals: readonly [import("../../../common").RollupInterval.None];
    };
};
