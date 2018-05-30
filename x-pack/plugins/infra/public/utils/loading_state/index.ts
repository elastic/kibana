/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { initialLoadingState, LoadingState } from './loading_state';

export {
  isManualLoadingPolicy,
  isIntervalLoadingPolicy,
} from './loading_policy';

export {
  createRunningProgressReducer,
  createIdleProgressReducer,
  isUninitializedLoadingProgress,
  isRunningLoadingProgress,
} from './loading_progress';

export {
  createSuccessResultReducer,
  createFailureResultReducer,
  isUninitializedLoadingResult,
  isSuccessLoadingResult,
  isFailureLoadingResult,
  isExhaustedLoadingResult,
  getTimeOrDefault,
} from './loading_result';
