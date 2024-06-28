/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { LoadingState } from './loading_state';
export { initialLoadingState } from './loading_state';

export type { LoadingPolicy } from './loading_policy';
export { isManualLoadingPolicy, isIntervalLoadingPolicy } from './loading_policy';

export type { LoadingProgress } from './loading_progress';
export {
  createRunningProgressReducer,
  createIdleProgressReducer,
  isIdleLoadingProgress,
  isRunningLoadingProgress,
} from './loading_progress';

export type { LoadingResult } from './loading_result';
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
} from './loading_result';
