/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { ButtonColor } from '@elastic/eui/src/components/button/button';

interface IConfirmModalProps {
  title?: string;
  cancelButtonText?: string;
  confirmButtonText?: string;
  buttonColor?: ButtonColor;
  children?: React.ReactNode;
  onCancel(): void;
  onConfirm(): void;
}

export const ConfirmModal: React.FC<IConfirmModalProps> = ({
  title = 'Please confirm',
  cancelButtonText = 'Cancel',
  confirmButtonText = 'Ok',
  buttonColor = 'primary',
  children,
  onCancel,
  onConfirm,
}) => (
  <EuiOverlayMask>
    <EuiConfirmModal
      title={title}
      onCancel={onCancel}
      onConfirm={onConfirm}
      buttonColor={buttonColor}
      cancelButtonText={cancelButtonText}
      confirmButtonText={confirmButtonText}
      defaultFocusedButton="confirm"
    >
      {children}
    </EuiConfirmModal>
  </EuiOverlayMask>
);
