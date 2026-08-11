/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export {
  getDocumentTypeFilterForServiceDestinationStatistics,
  getDurationFieldForTransactions,
  getHasTransactionsEvents,
  getBackwardCompatibleDocumentTypeFilter,
  isSummaryFieldSupportedByDocType,
  isDurationSummaryNotSupportedFilter,
  getRollupIntervalForTimeRange,
  callAsyncWithDebug,
  cancelEsRequestOnAbort,
  getDataTierFilterCombined,
  calculateThroughputWithRange,
  getOutcomeAggregation,
  calculateFailedTransactionRate,
  type OutcomeAggregation,
} from './lib/helpers';

export { withApmSpan } from './utils/with_apm_span';
export { accessKnownApmEventFields } from './utils/access_known_fields';
