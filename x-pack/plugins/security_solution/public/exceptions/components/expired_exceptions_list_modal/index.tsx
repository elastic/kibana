/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';

import { EuiConfirmModal, EuiSwitch } from '@elastic/eui';
import * as i18n from '../../translations';

interface IncludeExpiredExceptionsModalProps {
  handleCloseModal: () => void;
  onModalConfirm: (includeExpired: boolean) => void;
}

export const IncludeExpiredExceptionsModal = memo<IncludeExpiredExceptionsModalProps>(
  ({ handleCloseModal, onModalConfirm }) => {
    const [includeExpired, setIncludeExpired] = useState(true);

    const handleSwitchChange = useCallback(() => {
      setIncludeExpired(!includeExpired);
    }, [setIncludeExpired, includeExpired]);

    const handleConfirm = useCallback(() => {
      onModalConfirm(includeExpired);
      handleCloseModal();
    }, [includeExpired, handleCloseModal, onModalConfirm]);

    return (
      <EuiConfirmModal
        title={i18n.EXPIRED_EXCEPTIONS_MODAL_TITLE}
        onCancel={handleCloseModal}
        onConfirm={handleConfirm}
        cancelButtonText={i18n.EXPIRED_EXCEPTIONS_MODAL_CANCEL_BUTTON}
        confirmButtonText={i18n.EXPIRED_EXCEPTIONS_MODAL_CONFIRM_BUTTON}
        defaultFocusedButton="confirm"
      >
        <EuiSwitch
          label={i18n.EXPIRED_EXCEPTIONS_MODAL_INCLUDE_SWITCH_LABEL}
          checked={includeExpired}
          onChange={handleSwitchChange}
        />
      </EuiConfirmModal>
    );
  }
);

IncludeExpiredExceptionsModal.displayName = ' IncludeExpiredExceptionsModal';
