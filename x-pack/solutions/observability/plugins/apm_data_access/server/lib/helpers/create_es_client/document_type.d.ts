import type { ProcessorEvent } from '@kbn/apm-types-shared';
import { type DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import type { ApmDocumentType } from '../../../../common/document_type';
import type { RollupInterval } from '../../../../common/rollup';
declare const documentTypeConfigMap: {
    readonly serviceTransactionMetric: {
        readonly processorEvent: ProcessorEvent.metric;
        readonly metricsetName: "service_transaction";
        readonly getQuery: (rollupInterval: RollupInterval) => {
            bool: {
                filter: estypes.QueryDslQueryContainer[];
            };
        };
        readonly rollupIntervals: RollupInterval[];
    };
    readonly serviceSummaryMetric: {
        readonly processorEvent: ProcessorEvent.metric;
        readonly metricsetName: "service_summary";
        readonly getQuery: (rollupInterval: RollupInterval) => {
            bool: {
                filter: estypes.QueryDslQueryContainer[];
            };
        };
        readonly rollupIntervals: RollupInterval[];
    };
    readonly transactionMetric: {
        readonly processorEvent: ProcessorEvent.metric;
        readonly metricsetName: "transaction";
        readonly getQuery: (rollupInterval: RollupInterval) => {
            bool: {
                filter: estypes.QueryDslQueryContainer[] | {
                    bool: {
                        filter: estypes.QueryDslQueryContainer[];
                        must_not: estypes.QueryDslQueryContainer[];
                    };
                }[];
            };
        };
        readonly rollupIntervals: RollupInterval[];
    };
    readonly transactionEvent: {
        readonly processorEvent: ProcessorEvent.transaction;
        readonly rollupIntervals: readonly [RollupInterval.None];
    };
    readonly serviceDestinationMetric: {
        readonly processorEvent: ProcessorEvent.metric;
        readonly metricsetName: "service_destination";
        readonly rollupIntervals: RollupInterval[];
        readonly getQuery: (rollupInterval: RollupInterval) => {
            bool: {
                filter: estypes.QueryDslQueryContainer[] | {
                    bool: {
                        filter: estypes.QueryDslQueryContainer[];
                        must_not: estypes.QueryDslQueryContainer[];
                    };
                }[];
            };
        };
    };
    readonly error: {
        readonly processorEvent: ProcessorEvent.error;
        readonly rollupIntervals: readonly [RollupInterval.None];
    };
    readonly span: {
        readonly processorEvent: ProcessorEvent.span;
        readonly rollupIntervals: readonly [RollupInterval.None];
    };
};
type DocumentTypeConfigOf<TApmDocumentType extends ApmDocumentType> = (typeof documentTypeConfigMap)[TApmDocumentType];
export declare function getConfigForDocumentType<TApmDocumentType extends ApmDocumentType>(docType: TApmDocumentType): DocumentTypeConfigOf<TApmDocumentType>;
export type ProcessorEventOfDocumentType<TApmDocumentType extends ApmDocumentType> = DocumentTypeConfigOf<TApmDocumentType>['processorEvent'];
export declare function getProcessorEventForDocumentType<TApmDocumentType extends ApmDocumentType>(documentType: TApmDocumentType): ProcessorEventOfDocumentType<TApmDocumentType>;
export declare function getMetricsetNameForDocumentType(documentType: ApmDocumentType): string | undefined;
export declare function getDatasetFilterForSchema(documentType: ApmDocumentType, rollupInterval: RollupInterval, schema: DataSchemaFormat): estypes.QueryDslQueryContainer[];
export {};
