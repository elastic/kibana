/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiText } from '@elastic/eui';
import React, { memo } from 'react';
import * as i18n from './translations';

export interface UpgradeConflictsModalProps {
  onCancel: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  onConfirm?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const UpgradeConflictsModalComponent = ({ onCancel, onConfirm }: UpgradeConflictsModalProps) => {
  return (
    <EuiConfirmModal
      title={i18n.UPGRADE_CONFLICTS_MODAL_TITLE}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.UPGRADE_CONFLICTS_MODAL_CANCEL}
      confirmButtonText={i18n.UPGRADE_CONFLICTS_MODAL_CONFIRM}
      buttonColor="primary"
      defaultFocusedButton="confirm"
      data-test-subj="upgradeConflictsModal"
    >
      <EuiText>{i18n.UPGRADE_CONFLICTS_MODAL_BODY}</EuiText>
    </EuiConfirmModal>
  );
};

export const UpgradeConflictsModal = memo(UpgradeConflictsModalComponent);
