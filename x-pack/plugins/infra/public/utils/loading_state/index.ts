/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { initialLoadingState, LoadingState } from './loading_state';

export { isManualLoadingPolicy, isIntervalLoadingPolicy, LoadingPolicy } from './loading_policy';

export {
  createRunningProgressReducer,
  createIdleProgressReducer,
  isIdleLoadingProgress,
  isRunningLoadingProgress,
  LoadingProgress,
} from './loading_progress';

export {
  createFailureResult,
  createFailureResultReducer,
  createSuccessResult,
  createSuccessResultReducer,
  getTimeOrDefault,
  isExhaustedLoadingResult,
  isFailureLoadingResult,
  isSuccessLoadingResult,
  isUninitializedLoadingResult,
  LoadingResult,
} from './loading_result';
