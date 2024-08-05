/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import * as i18n from './translations';

interface ConfirmDeleteEndpointModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteEndpointModal: React.FC<ConfirmDeleteEndpointModalProps> = ({
  onCancel,
  onConfirm,
}) => {
  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={i18n.CANCEL}
      confirmButtonText={i18n.DELETE_ACTION_LABEL}
      defaultFocusedButton="confirm"
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={i18n.DELETE_TITLE}
    >
      {i18n.CONFIRM_DELETE_WARNING}
    </EuiConfirmModal>
  );
};
