/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal, EuiText } from '@elastic/eui';
import { CONSOLE_EXIT_MODAL_INFO } from '../translations';
import { ConsoleExitModalActionLogLink } from './console_exit_modal_link';

export const ConsoleExitModal = memo(
  ({ agentId, hostName, onClose }: { agentId: string; hostName: string; onClose: () => void }) => {
    return (
      <EuiConfirmModal
        confirmButtonText={CONSOLE_EXIT_MODAL_INFO.confirmButtonText}
        defaultFocusedButton="confirm"
        onCancel={onClose}
        onConfirm={onClose}
        title={CONSOLE_EXIT_MODAL_INFO.title}
        maxWidth={500}
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.consolePageOverlay.exitModal.body"
            defaultMessage="Pending actions will resume."
          />
        </EuiText>
        <ConsoleExitModalActionLogLink agentId={agentId} hostName={hostName} onClose={onClose} />
      </EuiConfirmModal>
    );
  }
);
ConsoleExitModal.displayName = 'ConsoleExitModal';
