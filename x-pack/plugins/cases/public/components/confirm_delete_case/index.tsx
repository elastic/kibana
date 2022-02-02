/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import * as i18n from './translations';

interface ConfirmDeleteCaseModalProps {
  caseTitle: string;
  isModalVisible: boolean;
  caseQuantity?: number;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteCaseModalComp: React.FC<ConfirmDeleteCaseModalProps> = ({
  caseTitle,
  isModalVisible,
  caseQuantity = 1,
  onCancel,
  onConfirm,
}) => {
  if (!isModalVisible) {
    return null;
  }
  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={i18n.CANCEL}
      confirmButtonText={i18n.DELETE_CASE(caseQuantity)}
      data-test-subj="confirm-delete-case-modal"
      defaultFocusedButton="confirm"
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={i18n.DELETE_SELECTED_CASES(caseQuantity, caseTitle)}
    >
      {i18n.CONFIRM_QUESTION(caseQuantity)}
    </EuiConfirmModal>
  );
};
ConfirmDeleteCaseModalComp.displayName = 'ConfirmDeleteCaseModalComp';

export const ConfirmDeleteCaseModal = React.memo(ConfirmDeleteCaseModalComp);
