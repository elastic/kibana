/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type as RuleType } from '@kbn/securitysolution-io-ts-alerting-types';
import { invariant } from '../../../../../../common/utils/invariant';
import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { BulkActionsDryRunErrCode } from '../../../../../../common/constants';
import type { BulkActionEditPayload } from '../../../../../../common/detection_engine/rule_management';
import { BulkActionEditType } from '../../../../../../common/detection_engine/rule_management';
import type { RuleAlertType } from '../../../rule_schema';
import { isIndexPatternsBulkEditAction } from './utils';
import { throwDryRunError } from './dry_run';
import type { MlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';

interface BulkActionsValidationArgs {
  rule: RuleAlertType;
  mlAuthz: MlAuthz;
}

interface BulkEditBulkActionsValidationArgs {
  ruleType: RuleType;
  mlAuthz: MlAuthz;
  edit: BulkActionEditPayload[];
  immutable: boolean;
}

interface DryRunBulkEditBulkActionsValidationArgs {
  rule: RuleAlertType;
  mlAuthz: MlAuthz;
  edit: BulkActionEditPayload[];
}

/**
 * throws ML authorization error wrapped with MACHINE_LEARNING_AUTH error code
 * @param mlAuthz - {@link MlAuthz}
 * @param ruleType - {@link RuleType}
 */
const throwMlAuthError = (mlAuthz: MlAuthz, ruleType: RuleType) =>
  throwDryRunError(
    async () => throwAuthzError(await mlAuthz.validateRuleType(ruleType)),
    BulkActionsDryRunErrCode.MACHINE_LEARNING_AUTH
  );

/**
 * runs validation for bulk enable for a single rule
 * @param params - {@link BulkActionsValidationArgs}
 */
export const validateBulkEnableRule = async ({ rule, mlAuthz }: BulkActionsValidationArgs) => {
  if (!rule.enabled) {
    await throwMlAuthError(mlAuthz, rule.params.type);
  }
};

/**
 * runs validation for bulk disable for a single rule
 * @param params - {@link BulkActionsValidationArgs}
 */
export const validateBulkDisableRule = async ({ rule, mlAuthz }: BulkActionsValidationArgs) => {
  if (rule.enabled) {
    await throwMlAuthError(mlAuthz, rule.params.type);
  }
};

/**
 * runs validation for bulk duplicate for a single rule
 * @param params - {@link BulkActionsValidationArgs}
 */
export const validateBulkDuplicateRule = async ({ rule, mlAuthz }: BulkActionsValidationArgs) => {
  await throwMlAuthError(mlAuthz, rule.params.type);
};

/**
 * runs validation for bulk edit for a single rule
 * @param params - {@link BulkActionsValidationArgs}
 */
export const validateBulkEditRule = async ({
  ruleType,
  mlAuthz,
  edit,
  immutable,
}: BulkEditBulkActionsValidationArgs) => {
  await throwMlAuthError(mlAuthz, ruleType);

  // if rule can't be edited error will be thrown
  const canRuleBeEdited = !immutable || istEditApplicableToImmutableRule(edit);
  await throwDryRunError(
    () => invariant(canRuleBeEdited, "Elastic rule can't be edited"),
    BulkActionsDryRunErrCode.IMMUTABLE
  );
};

/**
 * add_rule_actions, set_rule_actions can be applied to prebuilt/immutable rules
 */
const istEditApplicableToImmutableRule = (edit: BulkActionEditPayload[]): boolean => {
  return edit.every(({ type }) =>
    [BulkActionEditType.set_rule_actions, BulkActionEditType.add_rule_actions].includes(type)
  );
};

/**
 * executes dry run validations for bulk edit of a single rule
 * @param params - {@link DryRunBulkEditBulkActionsValidationArgs}
 */
export const dryRunValidateBulkEditRule = async ({
  rule,
  edit,
  mlAuthz,
}: DryRunBulkEditBulkActionsValidationArgs) => {
  await validateBulkEditRule({
    ruleType: rule.params.type,
    mlAuthz,
    edit,
    immutable: rule.params.immutable,
  });

  // if rule is machine_learning, index pattern action can't be applied to it
  await throwDryRunError(
    () =>
      invariant(
        !isMlRule(rule.params.type) ||
          !edit.some((action) => isIndexPatternsBulkEditAction(action.type)),
        "Machine learning rule doesn't have index patterns"
      ),
    BulkActionsDryRunErrCode.MACHINE_LEARNING_INDEX_PATTERN
  );
};
