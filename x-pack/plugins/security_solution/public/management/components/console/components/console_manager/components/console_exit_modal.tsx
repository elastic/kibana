/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal, EuiSpacer, EuiText } from '@elastic/eui';
import { CONSOLE_EXIT_MODAL_INFO } from '../translations';
import { ConsoleExitModalActionLogLink, HostNameText } from './console_exit_modal_link';

export const ConsoleExitModal = memo(
  ({
    agentId,
    'data-test-subj': dataTestSubj,
    hostName,
    onClose,
  }: {
    agentId: string;
    'data-test-subj'?: string;
    hostName: string;
    onClose: () => void;
  }) => {
    return (
      <EuiConfirmModal
        confirmButtonText={CONSOLE_EXIT_MODAL_INFO.confirmButtonText}
        cancelButtonText={CONSOLE_EXIT_MODAL_INFO.cancelButtonText}
        data-test-subj={dataTestSubj}
        defaultFocusedButton="confirm"
        onCancel={onClose}
        onConfirm={onClose}
        title={CONSOLE_EXIT_MODAL_INFO.title}
        maxWidth={500}
      >
        <ConsoleExitModalActionLogLink
          agentId={agentId}
          hostName={hostName}
          onClose={onClose}
          data-test-subj={dataTestSubj}
        />
        <EuiSpacer size="l" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.consolePageOverlay.exitModal.body"
            defaultMessage="Access it here : {linkText}"
            values={{
              linkText: (
                <strong>
                  <FormattedMessage
                    id="xpack.securitySolution.consolePageOverlay.exitModal.linkText"
                    defaultMessage="Manage> Endpoints> {hostName}> Action log"
                    values={{
                      hostName: <HostNameText hostName={hostName} />,
                    }}
                  />
                </strong>
              ),
            }}
          />
        </EuiText>
      </EuiConfirmModal>
    );
  }
);
ConsoleExitModal.displayName = 'ConsoleExitModal';
