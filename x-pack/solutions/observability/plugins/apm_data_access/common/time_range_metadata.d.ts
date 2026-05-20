import type { ApmDataSource } from './data_source';
export interface TimeRangeMetadata {
    isUsingServiceDestinationMetrics: boolean;
    sources: Array<ApmDataSource & {
        hasDocs: boolean;
        hasDurationSummaryField: boolean;
    }>;
}
