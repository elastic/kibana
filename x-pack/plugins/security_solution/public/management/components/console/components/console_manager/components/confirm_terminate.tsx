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
    <div className="euiOverlayMask" style={{ position: 'absolute' }}>
      <EuiPanel className="terminate-confirm-panel">
        <EuiCallOut
          color="primary"
          iconType="iInCircle"
          title={
            <FormattedMessage
              id="xpack.securitySolution.console.popup.confirmTitle"
              defaultMessage="Terminate this session"
            />
          }
        >
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.securitySolution.console.popup.terminateMessage"
                defaultMessage="This will end your console session. Do you wish to continue?"
              />
            </p>
          </EuiText>
        </EuiCallOut>

        <EuiSpacer />

        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel}>
              <FormattedMessage
                id="xpack.securitySolution.console.popup.terminateConfirmCancelLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onConfirm} color="primary" fill>
              <FormattedMessage
                id="xpack.securitySolution.console.popup.terminateConfirmSubmitLabel"
                defaultMessage="Terminate"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
});
ConfirmTerminate.displayName = 'ConfirmTerminate';
