/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  type: 'pivot' | 'source';
}

const pivotModalTitle = i18n.translate(
  'xpack.transform.stepDefineForm.advancedEditorSwitchModalTitle',
  {
    defaultMessage: 'Unapplied changes',
  }
);
const sourceModalTitle = i18n.translate(
  'xpack.transform.stepDefineForm.advancedSourceEditorSwitchModalTitle',
  {
    defaultMessage: 'Edits will be lost',
  }
);
const pivotModalMessage = i18n.translate(
  'xpack.transform.stepDefineForm.advancedEditorSwitchModalBodyText',
  {
    defaultMessage: `The changes in the advanced editor haven't been applied yet. By disabling the advanced editor you will lose your edits.`,
  }
);
const sourceModalMessage = i18n.translate(
  'xpack.transform.stepDefineForm.advancedSourceEditorSwitchModalBodyText',
  {
    defaultMessage: `By switching back to KQL query bar you will lose your edits.`,
  }
);
const pivotModalConfirmButtonText = i18n.translate(
  'xpack.transform.stepDefineForm.advancedEditorSwitchModalConfirmButtonText',
  {
    defaultMessage: 'Disable advanced editor',
  }
);
const sourceModalConfirmButtonText = i18n.translate(
  'xpack.transform.stepDefineForm.advancedSourceEditorSwitchModalConfirmButtonText',
  {
    defaultMessage: 'Switch to KQL',
  }
);
const cancelButtonText = i18n.translate(
  'xpack.transform.stepDefineForm.advancedEditorSwitchModalCancelButtonText',
  {
    defaultMessage: 'Cancel',
  }
);

export const SwitchModal: FC<Props> = ({ onCancel, onConfirm, type }) => (
  <EuiOverlayMask>
    <EuiConfirmModal
      title={type === 'pivot' ? pivotModalTitle : sourceModalTitle}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={cancelButtonText}
      confirmButtonText={
        type === 'pivot' ? pivotModalConfirmButtonText : sourceModalConfirmButtonText
      }
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <p>{type === 'pivot' ? pivotModalMessage : sourceModalMessage}</p>
    </EuiConfirmModal>
  </EuiOverlayMask>
);
