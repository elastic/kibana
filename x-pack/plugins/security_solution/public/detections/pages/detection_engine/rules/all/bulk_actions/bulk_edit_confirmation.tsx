/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiConfirmModalProps } from '@elastic/eui';
import * as i18n from '../../translations';

interface Props {
  isAllSelected: boolean;
  rulesInstalled: number;
  rulesCustomInstalled: number;
  selectedElasticRuleCount: number;
  selectedCustomRuleCount: number;
  onCancel: EuiConfirmModalProps['onCancel'];
  onConfirm: EuiConfirmModalProps['onConfirm'];
}
const BulkEditConfirmationComponent = ({
  onCancel,
  onConfirm,
  isAllSelected,
  rulesInstalled,
  rulesCustomInstalled,
  selectedElasticRuleCount,
  selectedCustomRuleCount,
}: Props) => {
  const elasticRulesCount = isAllSelected ? rulesInstalled ?? 0 : selectedElasticRuleCount;
  const customRulesCount = isAllSelected ? rulesCustomInstalled ?? 0 : selectedCustomRuleCount;

  if (customRulesCount === 0) {
    return (
      <EuiConfirmModal
        title={i18n.BULK_EDIT_CONFIRMATION_TITLE(elasticRulesCount)}
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
      title={i18n.BULK_EDIT_CONFIRMATION_TITLE(elasticRulesCount)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.BULK_EDIT_CONFIRMATION_CONFIRM}
      cancelButtonText={i18n.BULK_EDIT_CONFIRMATION_CANCEL}
      defaultFocusedButton="confirm"
      data-test-subj="bulkEditConfirmationModal"
    >
      <p>{i18n.BULK_EDIT_CONFIRMATION_BODY(elasticRulesCount, customRulesCount)}</p>
    </EuiConfirmModal>
  );
};

export const BulkEditConfirmation = React.memo(BulkEditConfirmationComponent);

BulkEditConfirmation.displayName = 'BulkEditConfirmation';
