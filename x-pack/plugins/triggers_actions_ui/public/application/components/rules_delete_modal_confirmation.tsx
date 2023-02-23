/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiConfirmModal } from '@elastic/eui';
import React from 'react';
import { CANCEL_BUTTON_TEXT } from '../sections/rules_list/translations';

export const RulesDeleteModalConfirmation = ({
  confirmButtonText,
  confirmModalText,
  onCancel,
  onConfirm,
  showWarningText,
  warningText,
}: {
  confirmButtonText: string;
  confirmModalText: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  showWarningText?: boolean;
  warningText?: string;
}) => (
  <EuiConfirmModal
    buttonColor="danger"
    data-test-subj="rulesDeleteConfirmation"
    title={confirmButtonText}
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelButtonText={CANCEL_BUTTON_TEXT}
    confirmButtonText={confirmButtonText}
  >
    <p>{confirmModalText}</p>
    {showWarningText && <EuiCallOut title={<>{warningText}</>} color="warning" iconType="alert" />}
  </EuiConfirmModal>
);
