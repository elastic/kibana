/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '@kbn/licensing-plugin/common/types';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';

export {
  AlertingConnectorFeatureId,
  CasesConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
  GenerativeAIForSecurityConnectorFeatureId,
} from './connector_feature_config';
export interface ActionType {
  id: string;
  name: string;
  enabled: boolean;
  enabledInConfig: boolean;
  enabledInLicense: boolean;
  minimumLicenseRequired: LicenseType;
  supportedFeatureIds: string[];
  isSystemActionType: boolean;
}

export enum InvalidEmailReason {
  invalid = 'invalid',
  notAllowed = 'notAllowed',
}

export interface ValidatedEmail {
  address: string;
  valid: boolean;
  reason?: InvalidEmailReason;
}

// the result returned from an action type executor function
const ActionTypeExecutorResultStatusValues = ['ok', 'error'] as const;
type ActionTypeExecutorResultStatus = (typeof ActionTypeExecutorResultStatusValues)[number];

export interface ActionTypeExecutorResult<Data> {
  actionId: string;
  status: ActionTypeExecutorResultStatus;
  message?: string;
  serviceMessage?: string;
  data?: Data;
  retry?: null | boolean | Date;
  errorSource?: TaskErrorSource;
}

export type ActionTypeExecutorRawResult<Data> = ActionTypeExecutorResult<Data> & {
  error?: Error;
};

export function isActionTypeExecutorResult(
  result: unknown
): result is ActionTypeExecutorResult<unknown> {
  const unsafeResult = result as ActionTypeExecutorResult<unknown>;
  return (
    unsafeResult &&
    typeof unsafeResult?.actionId === 'string' &&
    ActionTypeExecutorResultStatusValues.includes(unsafeResult?.status)
  );
}

export interface ActionsPublicConfigType {
  allowedEmailDomains: string[];
}
