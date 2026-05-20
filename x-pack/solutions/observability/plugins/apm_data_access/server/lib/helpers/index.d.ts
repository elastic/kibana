export { getDocumentTypeFilterForServiceDestinationStatistics } from './spans/get_is_using_service_destination_metrics';
export { getDurationFieldForTransactions, getHasTransactionsEvents, getBackwardCompatibleDocumentTypeFilter, isSummaryFieldSupportedByDocType, isDurationSummaryNotSupportedFilter, } from './transactions';
export { getRollupIntervalForTimeRange } from './get_rollup_interval_for_time_range';
export { APMEventClient, type APMEventESSearchRequest, type APMEventClientConfig, type APMLogEventESSearchRequest, } from './create_es_client/create_apm_event_client';
export { callAsyncWithDebug } from './create_es_client/call_async_with_debug';
export { cancelEsRequestOnAbort } from './create_es_client/cancel_es_request_on_abort';
export { getDataTierFilterCombined } from './tier_filter';
export { calculateThroughputWithRange } from './calculate_throughput';
export { getOutcomeAggregation, calculateFailedTransactionRate, type OutcomeAggregation, } from './transaction_error_rate';
