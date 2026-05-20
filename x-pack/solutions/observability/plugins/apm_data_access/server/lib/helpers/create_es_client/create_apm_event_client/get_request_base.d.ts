import type { ProcessorEvent } from '@kbn/apm-types-shared';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { ApmDataSource } from '../../../../../common/data_source';
export declare function processorEventsToIndex(events: ProcessorEvent[], indices: APMIndices): string[];
export declare function getRequestBase(options: {
    apm: {
        events: ProcessorEvent[];
    } | {
        sources: ApmDataSource[];
    };
    indices: APMIndices;
    skipProcessorEventFilter?: boolean;
}): {
    index: string[];
    events: ProcessorEvent[];
    filters: import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[];
};
