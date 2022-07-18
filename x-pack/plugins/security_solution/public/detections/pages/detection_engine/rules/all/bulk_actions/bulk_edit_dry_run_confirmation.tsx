/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';

import * as i18n from '../../translations';
import type { DryRunResult } from './use_bulk_actions_dry_run';
import { BulkEditRuleErrorsList } from './bulk_edit_rule_errors_list';

interface BulkEditDryRunConfirmationProps {
  result?: DryRunResult;
  onCancel: () => void;
  onConfirm: () => void;
}

const BulkEditDryRunConfirmationComponent = ({
  onCancel,
  onConfirm,
  result,
}: BulkEditDryRunConfirmationProps) => {
  const { failedRulesCount = 0, succeededRulesCount = 0, ruleErrors = [] } = result ?? {};

  // if no rule can be edited, modal window that denies bulk edit action will be displayed
  if (succeededRulesCount === 0) {
    return (
      <EuiConfirmModal
        title={i18n.BULK_EDIT_CONFIRMATION_DENIED_TITLE(failedRulesCount)}
        onCancel={onCancel}
        onConfirm={onCancel}
        confirmButtonText={i18n.BULK_EDIT_CONFIRMATION_CLOSE}
        defaultFocusedButton="confirm"
        data-test-subj="bulkEditRejectModal"
      >
        <BulkEditRuleErrorsList ruleErrors={ruleErrors} />
      </EuiConfirmModal>
    );
  }

  // if there are rules that can and cannot be edited, modal window that propose edit of some the rules will be displayed
  return (
    <EuiConfirmModal
      title={i18n.BULK_EDIT_CONFIRMATION_PARTLY_TITLE(succeededRulesCount)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.BULK_EDIT_CONFIRMATION_CONFIRM(succeededRulesCount)}
      cancelButtonText={i18n.BULK_EDIT_CONFIRMATION_CANCEL}
      defaultFocusedButton="confirm"
      data-test-subj="bulkEditConfirmationModal"
    >
      <BulkEditRuleErrorsList ruleErrors={ruleErrors} />
    </EuiConfirmModal>
  );
};

export const BulkEditDryRunConfirmation = React.memo(BulkEditDryRunConfirmationComponent);

BulkEditDryRunConfirmation.displayName = 'BulkEditDryRunConfirmation';
