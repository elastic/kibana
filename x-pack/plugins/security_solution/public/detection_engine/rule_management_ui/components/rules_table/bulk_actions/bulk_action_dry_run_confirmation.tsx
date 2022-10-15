/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';

import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { BulkActionRuleErrorsList } from './bulk_action_rule_errors_list';
import { BulkAction } from '../../../../../../common/detection_engine/rule_management';
import { assertUnreachable } from '../../../../../../common/utility_types';

import type { BulkActionForConfirmation, DryRunResult } from './types';

const getActionRejectedTitle = (
  bulkAction: BulkActionForConfirmation,
  failedRulesCount: number
) => {
  switch (bulkAction) {
    case BulkAction.edit:
      return i18n.BULK_EDIT_CONFIRMATION_REJECTED_TITLE(failedRulesCount);
    case BulkAction.export:
      return i18n.BULK_EXPORT_CONFIRMATION_REJECTED_TITLE(failedRulesCount);
    default:
      assertUnreachable(bulkAction);
  }
};

const getActionConfirmLabel = (
  bulkAction: BulkActionForConfirmation,
  succeededRulesCount: number
) => {
  switch (bulkAction) {
    case BulkAction.edit:
      return i18n.BULK_EDIT_CONFIRMATION_CONFIRM(succeededRulesCount);
    case BulkAction.export:
      return i18n.BULK_EXPORT_CONFIRMATION_CONFIRM(succeededRulesCount);
    default:
      assertUnreachable(bulkAction);
  }
};

interface BulkEditDryRunConfirmationProps {
  bulkAction: BulkActionForConfirmation;
  result?: DryRunResult;
  onCancel: () => void;
  onConfirm: () => void;
}

const BulkActionDryRunConfirmationComponent = ({
  onCancel,
  onConfirm,
  result,
  bulkAction,
}: BulkEditDryRunConfirmationProps) => {
  const { failedRulesCount = 0, succeededRulesCount = 0, ruleErrors = [] } = result ?? {};

  // if no rule can be edited, modal window that denies bulk edit action will be displayed
  if (succeededRulesCount === 0) {
    return (
      <EuiConfirmModal
        title={getActionRejectedTitle(bulkAction, failedRulesCount)}
        onCancel={onCancel}
        onConfirm={onCancel}
        confirmButtonText={i18n.BULK_ACTION_CONFIRMATION_CLOSE}
        defaultFocusedButton="confirm"
        data-test-subj="bulkActionRejectModal"
      >
        <BulkActionRuleErrorsList bulkAction={bulkAction} ruleErrors={ruleErrors} />
      </EuiConfirmModal>
    );
  }

  // if there are rules that can and cannot be edited, modal window that propose edit of some the rules will be displayed
  return (
    <EuiConfirmModal
      title={i18n.BULK_ACTION_CONFIRMATION_PARTLY_TITLE(succeededRulesCount)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={getActionConfirmLabel(bulkAction, succeededRulesCount)}
      cancelButtonText={i18n.BULK_EDIT_CONFIRMATION_CANCEL}
      defaultFocusedButton="confirm"
      data-test-subj="bulkActionConfirmationModal"
    >
      <BulkActionRuleErrorsList bulkAction={bulkAction} ruleErrors={ruleErrors} />
    </EuiConfirmModal>
  );
};

export const BulkActionDryRunConfirmation = React.memo(BulkActionDryRunConfirmationComponent);

BulkActionDryRunConfirmation.displayName = 'BulkActionDryRunConfirmation';
