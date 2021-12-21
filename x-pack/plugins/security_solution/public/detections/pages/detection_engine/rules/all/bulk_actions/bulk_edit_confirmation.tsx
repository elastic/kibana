/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import * as i18n from '../../translations';

interface Props {
  isAllSelected: boolean;
  customRulesCount: number;
  elasticRulesCount: number;
  selectedElasticRulesCount: number;
  selectedCustomRulesCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}
const BulkEditConfirmationComponent = ({
  onCancel,
  onConfirm,
  isAllSelected,
  customRulesCount,
  elasticRulesCount,
  selectedCustomRulesCount,
  selectedElasticRulesCount,
}: Props) => {
  const displayElasticRules = isAllSelected ? elasticRulesCount : selectedElasticRulesCount;
  const displayCustomRules = isAllSelected ? customRulesCount : selectedCustomRulesCount;

  if (displayElasticRules === 0) {
    setTimeout(onConfirm, 0);
    return null;
  }

  if (displayCustomRules === 0) {
    return (
      <EuiConfirmModal
        title={i18n.BULK_EDIT_CONFIRMATION_TITLE(displayElasticRules)}
        onCancel={onCancel}
        onConfirm={onCancel}
        confirmButtonText={i18n.BULK_EDIT_CONFIRMATION_CANCEL}
        defaultFocusedButton="confirm"
        data-test-subj="bulkEditRejectModal"
      >
        <p>{i18n.BULK_EDIT_REJECT_BODY}</p>
      </EuiConfirmModal>
    );
  }

  return (
    <EuiConfirmModal
      title={i18n.BULK_EDIT_CONFIRMATION_TITLE(displayElasticRules)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.BULK_EDIT_CONFIRMATION_CONFIRM}
      cancelButtonText={i18n.BULK_EDIT_CONFIRMATION_CANCEL}
      defaultFocusedButton="confirm"
      data-test-subj="bulkEditConfirmationModal"
    >
      <p>{i18n.BULK_EDIT_CONFIRMATION_BODY(displayElasticRules, displayCustomRules)}</p>
    </EuiConfirmModal>
  );
};

export const BulkEditConfirmation = React.memo(BulkEditConfirmationComponent);

BulkEditConfirmation.displayName = 'BulkEditConfirmation';
