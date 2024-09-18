/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getDocumentTypeFilterForServiceDestinationStatistics } from './spans/get_is_using_service_destination_metrics';
export { getBackwardCompatibleDocumentTypeFilter } from './transactions';
export {
  APMEventClient,
  type APMEventESSearchRequest,
  type APMEventClientConfig,
  type APMLogEventESSearchRequest,
} from './create_es_client/create_apm_event_client';

export {
  callAsyncWithDebug,
  getDebugBody,
  getDebugTitle,
} from './create_es_client/call_async_with_debug';

export { cancelEsRequestOnAbort } from './create_es_client/cancel_es_request_on_abort';

export { getExcludedDataTiersFilter, getDataTierFilterCombined } from './tier_filter';
