/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { parseDuration, validateDurationSchema } from '../../common/parse_duration';
export type { ILicenseState } from './license_state';
export { LicenseState } from './license_state';
export { validateRuleTypeParams } from './validate_rule_type_params';
export { getAlertNotifyWhenType } from './get_alert_notify_when_type';
export { verifyApiAccess } from './license_api_access';
export { ErrorWithReason, getReasonFromError, isErrorWithReason } from './error_with_reason';
export type {
  AlertTypeDisabledReason,
  ErrorThatHandlesItsOwnResponse,
  ElasticsearchError,
} from './errors';
export { AlertTypeDisabledError, RuleMutedError, isErrorThatHandlesItsOwnResponse } from './errors';
export {
  executionStatusFromState,
  executionStatusFromError,
  ruleExecutionStatusToRaw,
  ruleExecutionStatusFromRaw,
} from './rule_execution_status';
export { getRecoveredAlerts } from './get_recovered_alerts';
export { createWrappedScopedClusterClientFactory } from './wrap_scoped_cluster_client';
