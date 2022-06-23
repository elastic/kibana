/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { invariant } from '../../../../../common/utils/invariant';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { BULK_ACTIONS_DRY_RUN_ERR_CODE } from '../../../../../common/constants';
import type { BulkActionEditPayload } from '../../../../../common/detection_engine/schemas/common/schemas';
import type { RuleAlertType } from '../types';
import { isIndexPatternsBulkEditAction } from './utils';

/**
 * Error instance that has properties: errorCode & statusCode to use within run_dry
 * {@link BULK_ACTIONS_DRY_RUN_ERR_CODE | errorCode} is used to categorize error and make possible to handle it later
 */
export class DryRunError extends Error {
  public readonly errorCode: BULK_ACTIONS_DRY_RUN_ERR_CODE;
  public readonly statusCode: number;

  constructor(message: string, errorCode: BULK_ACTIONS_DRY_RUN_ERR_CODE, statusCode?: number) {
    super(message);
    this.name = 'BulkActionDryRunError';
    this.errorCode = errorCode;
    this.statusCode = statusCode ?? 500;
  }
}

/**
 * executes function, if error thrown, wraps this error into {@link DryRunError}
 * @param executor - function that can be executed
 * @param errorCode - enum error code {@link BULK_ACTIONS_DRY_RUN_ERR_CODE} to use in DryRunError wrapper
 */
export const throwDryRunError = async (
  executor: () => void,
  errorCode: BULK_ACTIONS_DRY_RUN_ERR_CODE
) => {
  try {
    await executor();
  } catch (e) {
    throw new DryRunError(e.message, errorCode, e.statusCode);
  }
};

/**
 * executes dry run validations for bulk edit of rule
 * @param rule {@link RuleAlertType} that should be validated
 * @param edit {@link  BulkActionEditPayload}[] bulk edit payload
 */
export const dryRunBulkEdit = async (rule: RuleAlertType, edit: BulkActionEditPayload[]) => {
  // if rule is immutable, it can't be edited
  await throwDryRunError(
    () => invariant(rule.params.immutable === false, "Elastic rule can't be edited"),
    BULK_ACTIONS_DRY_RUN_ERR_CODE.IMMUTABLE
  );

  // if rule is machine_learning, index pattern action can't be applied to it
  await throwDryRunError(
    () =>
      invariant(
        !isMlRule(rule.params.type) ||
          !edit.some((action) => isIndexPatternsBulkEditAction(action.type)),
        "Machine learning rule doesn't have index patterns"
      ),
    BULK_ACTIONS_DRY_RUN_ERR_CODE.MACHINE_LEARNING_INDEX_PATTERN
  );
};
