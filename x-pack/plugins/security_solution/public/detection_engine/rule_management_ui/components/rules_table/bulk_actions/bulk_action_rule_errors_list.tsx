/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  BulkActionsDryRunErrCode,
  MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS,
} from '../../../../../../common/constants';
import { BulkActionTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';

import type { DryRunResult, BulkActionForConfirmation } from './types';

interface BulkActionRuleErrorItemProps {
  errorCode: BulkActionsDryRunErrCode | undefined;
  message: string;
  rulesCount: number;
}

const BulkEditRuleErrorItem = ({
  errorCode,
  message,
  rulesCount,
}: BulkActionRuleErrorItemProps) => {
  switch (errorCode) {
    case BulkActionsDryRunErrCode.IMMUTABLE:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.elasticRulesEditDescription"
            defaultMessage="{rulesCount, plural, =1 {# prebuilt Elastic rule} other {# prebuilt Elastic rules}} (editing prebuilt rules is not supported)"
            values={{ rulesCount }}
          />
        </li>
      );
    case BulkActionsDryRunErrCode.MACHINE_LEARNING_INDEX_PATTERN:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.machineLearningRulesIndexEditDescription"
            defaultMessage="{rulesCount, plural, =1 {# custom machine learning rule} other {# custom machine learning rules}} (these rules don't have index patterns)"
            values={{ rulesCount }}
          />
        </li>
      );
    case BulkActionsDryRunErrCode.MACHINE_LEARNING_AUTH:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.machineLearningRulesAuthDescription"
            defaultMessage="{rulesCount, plural, =1 {# machine learning rule} other {# machine learning rules}} can't be edited ({message})"
            values={{ rulesCount, message }}
          />
        </li>
      );
    case BulkActionsDryRunErrCode.ESQL_INDEX_PATTERN:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.esqlRulesIndexEditDescription"
            defaultMessage="{rulesCount, plural, =1 {# custom ES|QL rule} other {# custom ES|QL rules}} (these rules don't have index patterns)"
            values={{ rulesCount }}
          />
        </li>
      );
    default:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.defaultRulesEditFailureDescription"
            defaultMessage="{rulesCount, plural, =1 {# rule} other {# rules}} can't be edited ({message})"
            values={{ rulesCount, message }}
          />
        </li>
      );
  }
};

const BulkExportRuleErrorItem = ({
  errorCode,
  message,
  rulesCount,
}: BulkActionRuleErrorItemProps) => {
  switch (errorCode) {
    case BulkActionsDryRunErrCode.IMMUTABLE:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.elasticRulesExportDescription"
            defaultMessage="{rulesCount, plural, =1 {# prebuilt Elastic rule} other {# prebuilt Elastic rules}} (exporting prebuilt rules is not supported)"
            values={{ rulesCount }}
          />
        </li>
      );
    default:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.defaultRulesExportFailureDescription"
            defaultMessage="{rulesCount, plural, =1 {# rule} other {# rules}} can't be exported ({message})"
            values={{ rulesCount, message }}
          />
        </li>
      );
  }
};

const BulkScheduleBackfillErrorItem = ({
  errorCode,
  message,
  rulesCount,
}: BulkActionRuleErrorItemProps) => {
  switch (errorCode) {
    case BulkActionsDryRunErrCode.MANUAL_RULE_RUN_FEATURE:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.manualRuleRunFeatureDisabledDescription"
            defaultMessage="{rulesCount, plural, =1 {# rule} other {# rules}} (Manual rule run feature is disabled)"
            values={{ rulesCount }}
          />
        </li>
      );
    case BulkActionsDryRunErrCode.BACKFILL_DISABLED_RULE:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.scheduleDisabledRuleDescription"
            defaultMessage="{rulesCount, plural, =1 {# rule} other {# rules}} (Cannot schedule backfill for disabled rules)"
            values={{ rulesCount }}
          />
        </li>
      );
    case BulkActionsDryRunErrCode.BACKFILL_IN_THE_FUTURE:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.scheduleInFutureRuleDescription"
            defaultMessage="{rulesCount, plural, =1 {# rule} other {# rules}} (Backfill cannot be scheduled for the future)"
            values={{ rulesCount }}
          />
        </li>
      );
    case BulkActionsDryRunErrCode.BACKFILL_START_FAR_IN_THE_PAST:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.scheduleFarInPastRuleDescription"
            defaultMessage="{rulesCount, plural, =1 {# rule} other {# rules}} (Backfill cannot look back more than {daysCount, plural, =1 {# day} other {# days}})"
            values={{ rulesCount, daysCount: MAX_SCHEDULE_BACKFILL_LOOKBACK_WINDOW_DAYS }}
          />
        </li>
      );
    case BulkActionsDryRunErrCode.BACKFILL_START_GREATER_THAN_END:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.scheduleInvalidTimeRangeRuleDescription"
            defaultMessage="{rulesCount, plural, =1 {# rule} other {# rules}} (Backfill end must be greater than backfill start)"
            values={{ rulesCount }}
          />
        </li>
      );
    default:
      return (
        <li key={message}>
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.defaultScheduleRuleRunFailureDescription"
            defaultMessage="{rulesCount, plural, =1 {# rule} other {# rules}} can't be scheduled ({message})"
            values={{ rulesCount, message }}
          />
        </li>
      );
  }
};

interface BulkActionRuleErrorsListProps {
  ruleErrors: DryRunResult['ruleErrors'];
  bulkAction: BulkActionForConfirmation;
}

const BulkActionRuleErrorsListComponent = ({
  ruleErrors = [],
  bulkAction,
}: BulkActionRuleErrorsListProps) => {
  if (ruleErrors.length === 0) {
    return null;
  }

  return (
    <>
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.actionRejectionDescription"
        defaultMessage="This action can't be applied to the following rules in your selection:"
      />
      <EuiSpacer />
      <ul>
        {ruleErrors.map(({ message, errorCode, ruleIds }) => {
          const rulesCount = ruleIds.length;
          switch (bulkAction) {
            case BulkActionTypeEnum.edit:
              return (
                <BulkEditRuleErrorItem
                  message={message}
                  errorCode={errorCode}
                  rulesCount={rulesCount}
                />
              );

            case BulkActionTypeEnum.export:
              return (
                <BulkExportRuleErrorItem
                  message={message}
                  errorCode={errorCode}
                  rulesCount={rulesCount}
                />
              );

            case BulkActionTypeEnum.backfill:
              return (
                <BulkScheduleBackfillErrorItem
                  message={message}
                  errorCode={errorCode}
                  rulesCount={rulesCount}
                />
              );

            default:
              return null;
          }
        })}
      </ul>
    </>
  );
};

export const BulkActionRuleErrorsList = React.memo(BulkActionRuleErrorsListComponent);

BulkActionRuleErrorsList.displayName = 'BulkActionRuleErrorsList';
