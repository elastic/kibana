export declare const PLUGIN_ID = "apmDataAccess";
export declare const PLUGIN_NAME = "apmDataAccess";
export type { ApmDataSource, ApmDataSourceWithSummary } from './data_source';
export { ApmDocumentType, type ApmServiceTransactionDocumentType, type ApmTransactionDocumentType, } from './document_type';
export type { TimeRangeMetadata } from './time_range_metadata';
export { getPreferredBucketSizeAndDataSource } from './utils/get_preferred_bucket_size_and_data_source';
export { getBucketSize } from './utils/get_bucket_size';
export { RollupInterval } from './rollup';
