/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  onCancel: () => void;
  onConfirm: () => void;
}

const modalTitle = i18n.translate('xpack.transform.stepDefineForm.runtimeEditorSwitchModalTitle', {
  defaultMessage: 'Edits will be lost',
});

const cancelButtonText = i18n.translate(
  'xpack.transform.stepDefineForm.runtimeEditorSwitchModalCancelButtonText',
  {
    defaultMessage: 'Cancel',
  }
);

const applyChangesText = i18n.translate(
  'xpack.transform.stepDefineForm.runtimeEditorSwitchModalConfirmButtonText',
  {
    defaultMessage: 'Close editor',
  }
);
const modalMessage = i18n.translate(
  'xpack.transform.stepDefineForm.runtimeEditorSwitchModalBodyText',
  {
    defaultMessage: `The changes in the advanced editor haven't been applied yet. By closing the editor you will lose your edits.`,
  }
);

export const SwitchModal: FC<Props> = ({ onCancel, onConfirm }) => (
  <EuiConfirmModal
    title={modalTitle}
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelButtonText={cancelButtonText}
    confirmButtonText={applyChangesText}
    buttonColor="danger"
    defaultFocusedButton="confirm"
  >
    <p>{modalMessage}</p>
  </EuiConfirmModal>
);
