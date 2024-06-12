/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type as RuleType } from '@kbn/securitysolution-io-ts-alerting-types';
import moment from 'moment';
import type { ExperimentalFeatures } from '../../../../../../common';
import { invariant } from '../../../../../../common/utils/invariant';
import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { isEsqlRule } from '../../../../../../common/detection_engine/utils';
import {
  BulkActionsDryRunErrCode,
  MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS,
} from '../../../../../../common/constants';
import type {
  BulkActionEditPayload,
  BulkActionEditType,
  BulkScheduleBackfill,
} from '../../../../../../common/api/detection_engine/rule_management';
import { BulkActionEditTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';
import type { RuleAlertType } from '../../../rule_schema';
import { isIndexPatternsBulkEditAction, isInvestigationFieldsBulkEditAction } from './utils';
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
  experimentalFeatures: ExperimentalFeatures;
}

interface DryRunScheduleBackfillBulkActionsValidationArgs extends BulkActionsValidationArgs {
  backfillPayload: BulkScheduleBackfill['backfill'];
  experimentalFeatures: ExperimentalFeatures;
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
  await throwMlAuthError(mlAuthz, rule.params.type);
};

/**
 * runs validation for bulk disable for a single rule
 * @param params - {@link BulkActionsValidationArgs}
 */
export const validateBulkDisableRule = async ({ rule, mlAuthz }: BulkActionsValidationArgs) => {
  await throwMlAuthError(mlAuthz, rule.params.type);
};

/**
 * runs validation for bulk duplicate for a single rule
 * @param params - {@link BulkActionsValidationArgs}
 */
export const validateBulkDuplicateRule = async ({ rule, mlAuthz }: BulkActionsValidationArgs) => {
  await throwMlAuthError(mlAuthz, rule.params.type);
};

/**
 * runs validation for bulk schedule backfill for a single rule
 * @param params - {@link DryRunScheduleBackfillBulkActionsValidationArgs}
 */
export const validateBulkScheduleBackfill = async ({
  rule,
  backfillPayload,
  experimentalFeatures,
}: DryRunScheduleBackfillBulkActionsValidationArgs) => {
  const now = moment();
  const startDate = moment(backfillPayload.start_date);

  // check that start date is not in the future
  await throwDryRunError(
    () => invariant(now.isSameOrAfter(startDate), 'Backfill cannot be scheduled for the future'),
    BulkActionsDryRunErrCode.BACKFILL_IN_THE_FUTURE
  );

  // check that start date is not more than 90 days in the past
  const isStartDateOutOfRange = now
    .clone()
    .subtract(MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS, 'd')
    .isAfter(startDate);
  await throwDryRunError(
    () =>
      invariant(
        !isStartDateOutOfRange,
        `Backfill cannot look back more than ${MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS} days`
      ),
    BulkActionsDryRunErrCode.BACKFILL_START_FAR_IN_THE_PAST
  );

  if (backfillPayload.end_date) {
    const endDate = moment(backfillPayload.end_date);

    // check that end date is greater than start date
    await throwDryRunError(
      () =>
        invariant(endDate.isAfter(startDate), 'Backfill end must be greater than backfill start'),
      BulkActionsDryRunErrCode.BACKFILL_START_GREATER_THAN_END
    );

    // check that start date is not in the future
    await throwDryRunError(
      () => invariant(now.isSameOrAfter(endDate), 'Backfill cannot be scheduled for the future'),
      BulkActionsDryRunErrCode.BACKFILL_IN_THE_FUTURE
    );
  }

  // check whether "manual rule run" feature is enabled
  await throwDryRunError(
    () =>
      invariant(experimentalFeatures?.manualRuleRunEnabled, 'Manual rule run feature is disabled.'),
    BulkActionsDryRunErrCode.MANUAL_RULE_RUN_FEATURE
  );

  await throwDryRunError(
    () => invariant(rule.enabled, 'Cannot schedule backfill for a disabled rule'),
    BulkActionsDryRunErrCode.BACKFILL_DISABLED_RULE
  );
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
  const applicableActions: BulkActionEditType[] = [
    BulkActionEditTypeEnum.set_rule_actions,
    BulkActionEditTypeEnum.add_rule_actions,
  ];
  return edit.every(({ type }) => applicableActions.includes(type));
};

/**
 * executes dry run validations for bulk edit of a single rule
 * @param params - {@link DryRunBulkEditBulkActionsValidationArgs}
 */
export const dryRunValidateBulkEditRule = async ({
  rule,
  edit,
  mlAuthz,
  experimentalFeatures,
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

  // if rule is es|ql, index pattern action can't be applied to it
  await throwDryRunError(
    () =>
      invariant(
        !isEsqlRule(rule.params.type) ||
          !edit.some((action) => isIndexPatternsBulkEditAction(action.type)),
        "ES|QL rule doesn't have index patterns"
      ),
    BulkActionsDryRunErrCode.ESQL_INDEX_PATTERN
  );

  // check whether "custom highlighted fields" feature is enabled
  await throwDryRunError(
    () =>
      invariant(
        experimentalFeatures.bulkCustomHighlightedFieldsEnabled ||
          !edit.some((action) => isInvestigationFieldsBulkEditAction(action.type)),
        'Bulk custom highlighted fields action feature is disabled.'
      ),
    BulkActionsDryRunErrCode.INVESTIGATION_FIELDS_FEATURE
  );
};
