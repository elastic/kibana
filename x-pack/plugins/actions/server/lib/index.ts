/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ExecutorError } from './executor_error';
export {
  validateParams,
  validateConfig,
  validateSecrets,
  validateConnector,
} from './validate_with_schema';
export { TaskRunnerFactory } from './task_runner_factory';
export type { ActionExecutorContract } from './action_executor';
export { ActionExecutor } from './action_executor';
export type { ILicenseState } from './license_state';
export { LicenseState } from './license_state';
export { verifyApiAccess } from './verify_api_access';
export { getActionTypeFeatureUsageName } from './get_action_type_feature_usage_name';
export { spaceIdToNamespace } from './space_id_to_namespace';
export {
  extractSavedObjectReferences,
  injectSavedObjectReferences,
} from './action_task_params_utils';
export type { ActionTypeDisabledReason } from './errors';
export { ActionTypeDisabledError, isErrorThatHandlesItsOwnResponse } from './errors';
export type { ActionExecutionSource } from './action_execution_source';
export {
  asSavedObjectExecutionSource,
  isSavedObjectExecutionSource,
  asHttpRequestExecutionSource,
  isHttpRequestExecutionSource,
} from './action_execution_source';
