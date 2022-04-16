/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '@kbn/licensing-plugin/common/types';

export interface ActionType {
  id: string;
  name: string;
  enabled: boolean;
  enabledInConfig: boolean;
  enabledInLicense: boolean;
  minimumLicenseRequired: LicenseType;
}

export interface ActionResult {
  id: string;
  actionTypeId: string;
  name: string;
  // This will have to remain `any` until we can extend Action Executors with generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
  isPreconfigured: boolean;
}

// the result returned from an action type executor function
const ActionTypeExecutorResultStatusValues = ['ok', 'error'] as const;
type ActionTypeExecutorResultStatus = typeof ActionTypeExecutorResultStatusValues[number];

export interface ActionTypeExecutorResult<Data> {
  actionId: string;
  status: ActionTypeExecutorResultStatus;
  message?: string;
  serviceMessage?: string;
  data?: Data;
  retry?: null | boolean | Date;
}

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
