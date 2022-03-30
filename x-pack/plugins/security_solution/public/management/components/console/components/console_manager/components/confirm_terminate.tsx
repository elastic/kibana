/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ConfirmTerminateProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmTerminate = memo<ConfirmTerminateProps>(({ onConfirm, onCancel }) => {
  return (
    <div
      className="euiOverlayMask"
      style={{ position: 'absolute' }}
      data-test-subj="consolePopupTerminateConfirmModal"
    >
      <EuiFocusTrap>
        <EuiPanel className="terminate-confirm-panel">
          <EuiCallOut
            color="primary"
            iconType="iInCircle"
            data-test-subj="consolePopupTerminateConfirmMessage"
            title={
              <FormattedMessage
                id="xpack.securitySolution.console.popup.confirmTitle"
                defaultMessage="Terminate this session"
              />
            }
          >
            <EuiText>
              <FormattedMessage
                id="xpack.securitySolution.console.popup.terminateMessage"
                defaultMessage="This will end your console session. Do you wish to continue?"
              />
            </EuiText>
          </EuiCallOut>

          <EuiSpacer />

          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onCancel}
                data-test-subj="consolePopupTerminateModalCancelButton"
              >
                <FormattedMessage
                  id="xpack.securitySolution.console.popup.terminateConfirmCancelLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={onConfirm}
                color="danger"
                fill
                data-test-subj="consolePopupTerminateModalTerminateButton"
              >
                <FormattedMessage
                  id="xpack.securitySolution.console.popup.terminateConfirmSubmitLabel"
                  defaultMessage="Terminate"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFocusTrap>
    </div>
  );
});
ConfirmTerminate.displayName = 'ConfirmTerminate';
