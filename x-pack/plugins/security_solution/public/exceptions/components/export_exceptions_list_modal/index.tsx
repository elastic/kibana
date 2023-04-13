/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';

import { EuiConfirmModal, EuiSwitch } from '@elastic/eui';
import * as i18n from '../../translations';

interface ExportExceptionsListModalProps {
  handleCloseModal: () => void;
  onModalConfirm: (includeExpired: boolean) => void;
}

export const ExportExceptionsListModal = memo<ExportExceptionsListModalProps>(
  ({ handleCloseModal, onModalConfirm }) => {
    const [exportExpired, setExportExpired] = useState(true);

    const handleSwitchChange = useCallback(() => {
      setExportExpired(!exportExpired);
    }, [setExportExpired, exportExpired]);

    const handleConfirm = useCallback(() => {
      onModalConfirm(exportExpired);
      handleCloseModal();
    }, [exportExpired, handleCloseModal, onModalConfirm]);

    return (
      <EuiConfirmModal
        title={i18n.EXPORT_MODAL_TITLE}
        onCancel={handleCloseModal}
        onConfirm={handleConfirm}
        cancelButtonText={i18n.EXPORT_MODAL_CANCEL_BUTTON}
        confirmButtonText={i18n.EXPORT_MODAL_CONFIRM_BUTTON}
        defaultFocusedButton="confirm"
      >
        <EuiSwitch
          label={i18n.EXPORT_MODAL_INCLUDE_SWITCH_LABEL}
          checked={exportExpired}
          onChange={handleSwitchChange}
        />
      </EuiConfirmModal>
    );
  }
);

ExportExceptionsListModal.displayName = 'ExportExceptionsListModal';
