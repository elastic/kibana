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
  caseTitle?: string;
  isModalVisible: boolean;
  isPlural: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteCaseModalComp: React.FC<ConfirmDeleteCaseModalProps> = ({
  caseTitle,
  isModalVisible,
  isPlural,
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
      confirmButtonText={isPlural ? i18n.DELETE_CASES : i18n.DELETE_CASE}
      data-test-subj="confirm-delete-case-modal"
      defaultFocusedButton="confirm"
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={
        isPlural
          ? i18n.DELETE_SELECTED_CASES
          : caseTitle == null
          ? i18n.DELETE_THIS_CASE
          : i18n.DELETE_TITLE(caseTitle)
      }
    >
      {isPlural ? i18n.CONFIRM_QUESTION_PLURAL : i18n.CONFIRM_QUESTION}
    </EuiConfirmModal>
  );
};

export const ConfirmDeleteCaseModal = React.memo(ConfirmDeleteCaseModalComp);
