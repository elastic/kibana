/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiConfirmModal, EuiSpacer, EuiText } from '@elastic/eui';

import * as i18n from './translations';

interface SaveWithErrorsModalProps {
  errors: string[];
  onCancel: () => void;
  onConfirm: () => void;
}

const SaveWithErrorsModalComponent = ({
  errors,
  onCancel,
  onConfirm,
}: SaveWithErrorsModalProps) => {
  return (
    <EuiConfirmModal
      data-test-subj="save-with-errors-confirmation-modal"
      title={i18n.SAVE_WITH_ERRORS_MODAL_TITLE}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.SAVE_WITH_ERRORS_CANCEL_BUTTON}
      confirmButtonText={i18n.SAVE_WITH_ERRORS_CONFIRM_BUTTON}
      defaultFocusedButton="confirm"
    >
      <>
        {i18n.SAVE_WITH_ERRORS_MODAL_MESSAGE(errors.length)}
        <EuiSpacer size="s" />
        <ul>
          {errors.map((validationError, idx) => {
            return (
              <li key={idx}>
                <EuiText>{validationError}</EuiText>
              </li>
            );
          })}
        </ul>
      </>
    </EuiConfirmModal>
  );
};

export const SaveWithErrorsModal = React.memo(SaveWithErrorsModalComponent);
SaveWithErrorsModal.displayName = 'SaveWithErrorsModal';
