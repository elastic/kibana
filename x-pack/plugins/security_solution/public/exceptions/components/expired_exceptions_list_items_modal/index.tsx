/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';

import { EuiConfirmModal, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import * as i18n from '../../translations';

export const CHECK_EXCEPTION_TTL_ACTION_TYPES = {
  DUPLICATE: 'duplicate',
  EXPORT: 'export',
} as const;

export type CheckExceptionTtlActionTypes =
  (typeof CHECK_EXCEPTION_TTL_ACTION_TYPES)[keyof typeof CHECK_EXCEPTION_TTL_ACTION_TYPES];

interface IncludeExpiredExceptionsModalProps {
  handleCloseModal: () => void;
  onModalConfirm: (includeExpired: boolean) => void;
  action: CheckExceptionTtlActionTypes;
}

export const IncludeExpiredExceptionsModal = memo<IncludeExpiredExceptionsModalProps>(
  ({ handleCloseModal, onModalConfirm, action }) => {
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
        title={
          action === CHECK_EXCEPTION_TTL_ACTION_TYPES.EXPORT
            ? i18n.EXPIRED_EXCEPTIONS_MODAL_EXPORT_TITLE
            : i18n.EXPIRED_EXCEPTIONS_MODAL_DUPLICATE_TITLE
        }
        onCancel={handleCloseModal}
        onConfirm={handleConfirm}
        cancelButtonText={i18n.EXPIRED_EXCEPTIONS_MODAL_CANCEL_BUTTON}
        confirmButtonText={
          action === CHECK_EXCEPTION_TTL_ACTION_TYPES.EXPORT
            ? i18n.EXPIRED_EXCEPTIONS_MODAL_CONFIRM_EXPORT_BUTTON
            : i18n.EXPIRED_EXCEPTIONS_MODAL_CONFIRM_DUPLICATE_BUTTON
        }
        defaultFocusedButton="confirm"
        data-test-subj="includeExpiredExceptionsConfirmationModal"
      >
        <EuiText>
          {action === CHECK_EXCEPTION_TTL_ACTION_TYPES.EXPORT
            ? i18n.EXPIRED_EXCEPTIONS_MODAL_EXPORT_DESCRIPTION
            : i18n.EXPIRED_EXCEPTIONS_MODAL_DUPLICATE_DESCRIPTION}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiSwitch
          label={i18n.EXPIRED_EXCEPTIONS_MODAL_INCLUDE_SWITCH_LABEL}
          checked={includeExpired}
          onChange={handleSwitchChange}
          data-test-subj="includeExpiredExceptionsConfirmationModalSwitch"
        />
      </EuiConfirmModal>
    );
  }
);

IncludeExpiredExceptionsModal.displayName = 'IncludeExpiredExceptionsModal';
