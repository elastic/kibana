/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiConfirmModal } from '@elastic/eui';

import * as i18n from '../../translations';
import { DryRunResult } from './use_bulk_actions_dry_run';
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
  const hasAllSucceeded = result?.summary?.failed === 0;
  const { total = 0, succeeded = 0 } = result?.summary ?? {};
  const failed = result?.failed ?? [];

  useEffect(() => {
    if (hasAllSucceeded) {
      setTimeout(onConfirm, 0);
    }
  }, [hasAllSucceeded, onConfirm]);

  // proceed straight to edit flyout if all rules can be edited successfully
  if (hasAllSucceeded) {
    return null;
  }

  if (succeeded === 0) {
    return (
      <EuiConfirmModal
        title={i18n.BULK_EDIT_CONFIRMATION_DENIED_TITLE(total)}
        onCancel={onCancel}
        onConfirm={onCancel}
        confirmButtonText={i18n.BULK_EDIT_CONFIRMATION_CLOSE}
        defaultFocusedButton="confirm"
        data-test-subj="bulkEditRejectModal"
      >
        <BulkEditRuleErrorsList actionErrors={failed} />
      </EuiConfirmModal>
    );
  }

  return (
    <EuiConfirmModal
      title={i18n.BULK_EDIT_CONFIRMATION_PARTLY_TITLE(succeeded)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.BULK_EDIT_CONFIRMATION_CONFIRM(succeeded)}
      cancelButtonText={i18n.BULK_EDIT_CONFIRMATION_CANCEL}
      defaultFocusedButton="confirm"
      data-test-subj="bulkEditConfirmationModal"
    >
      <BulkEditRuleErrorsList actionErrors={failed} />
    </EuiConfirmModal>
  );
};

export const BulkEditDryRunConfirmation = React.memo(BulkEditDryRunConfirmationComponent);

BulkEditDryRunConfirmation.displayName = 'BulkEditDryRunConfirmation';
