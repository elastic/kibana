/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface CloseFilterEditorConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

const strings = {
  getTitle: () =>
    i18n.translate('unifiedSearch.filter.closeEditorConfirmModal.title', {
      defaultMessage: 'Unsaved changes',
    }),
  getCancelButton: () =>
    i18n.translate('unifiedSearch.filter.closeEditorConfirmModal.cancelButton', {
      defaultMessage: 'Cancel',
    }),
  getConfirmButton: () =>
    i18n.translate('unifiedSearch.filter.closeEditorConfirmModal.confirmButton', {
      defaultMessage: 'Discard changes',
    }),
  getWarningLabel: () =>
    i18n.translate('unifiedSearch.filter.closeEditorConfirmModal.warningLabel', {
      defaultMessage: 'If you leave now, your unsaved filters will be lost.',
    }),
};

export const CloseFilterEditorConfirmModal = memo(function CloseFilterEditorConfirmModal(
  props: CloseFilterEditorConfirmModalProps
) {
  return (
    <EuiConfirmModal
      data-test-subj="close-filter-editor-confirm-modal"
      title={strings.getTitle()}
      cancelButtonText={strings.getCancelButton()}
      confirmButtonText={strings.getConfirmButton()}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      {...props}
    >
      <p>{strings.getWarningLabel()}</p>
    </EuiConfirmModal>
  );
});
