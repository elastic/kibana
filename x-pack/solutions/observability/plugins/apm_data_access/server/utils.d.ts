export { getDocumentTypeFilterForServiceDestinationStatistics, getDurationFieldForTransactions, getHasTransactionsEvents, getBackwardCompatibleDocumentTypeFilter, isSummaryFieldSupportedByDocType, isDurationSummaryNotSupportedFilter, getRollupIntervalForTimeRange, callAsyncWithDebug, cancelEsRequestOnAbort, getDataTierFilterCombined, calculateThroughputWithRange, getOutcomeAggregation, calculateFailedTransactionRate, type OutcomeAggregation, } from './lib/helpers';
export { withApmSpan } from './utils/with_apm_span';
export { accessKnownApmEventFields } from './utils/access_known_fields';
