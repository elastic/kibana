/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiConfirmModal, EuiText } from '@elastic/eui';
import { CONSOLE_EXIT_MODAL_INFO } from '../translations';

export const ConsoleExitModal = memo(
  ({
    'data-test-subj': dataTestSubj,
    message,
    onClose,
    onCancel,
  }: {
    'data-test-subj'?: string;
    message?: React.ReactNode;
    onClose: () => void;
    onCancel: () => void;
  }) => {
    return (
      <EuiConfirmModal
        confirmButtonText={CONSOLE_EXIT_MODAL_INFO.confirmButtonText}
        cancelButtonText={CONSOLE_EXIT_MODAL_INFO.cancelButtonText}
        data-test-subj={dataTestSubj}
        onCancel={onCancel}
        onConfirm={onClose}
        title={CONSOLE_EXIT_MODAL_INFO.title}
        maxWidth={500}
      >
        {message ? message : <EuiText size="s">{CONSOLE_EXIT_MODAL_INFO.genericMessage}</EuiText>}
      </EuiConfirmModal>
    );
  }
);
ConsoleExitModal.displayName = 'ConsoleExitModal';
