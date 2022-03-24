/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, ReactNode, useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiIcon,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import classNames from 'classnames';
import { ConfirmTerminate } from './confirm_terminate';

const ConsolePopupWrapper = styled.div`
  position: fixed;
  top: 100px;
  right: 0;
  min-height: 60vh;
  min-width: 40vw;
  max-width: 70vw;

  &.is-hidden {
    display: none;
  }

  &.is-confirming .modal-content {
    opacity: 0.3;
  }

  .console-holder {
    height: 100%;
  }

  .terminate-confirm-panel {
    max-width: 85%;
    flex-grow: 0;
  }
`;

type ConsolePopupProps = PropsWithChildren<{
  title: ReactNode;
  isHidden: boolean;
  onTerminate: () => void;
  onHide: () => void;
}>;

export const ConsolePopup = memo<ConsolePopupProps>(
  ({ children, isHidden, title, onTerminate, onHide }) => {
    const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);

    const cssClassNames = useMemo(() => {
      return classNames({
        euiModal: true,
        'euiModal--maxWidth-default': true,
        'is-hidden': isHidden,
        'is-confirming': showTerminateConfirm,
      });
    }, [isHidden, showTerminateConfirm]);

    const handleTerminateOnClick = useCallback(() => {
      setShowTerminateConfirm(true);
    }, []);

    const handleTerminateOnConfirm = useCallback(() => {
      setShowTerminateConfirm(false);
      onTerminate();
    }, [onTerminate]);

    const handleTerminateOnCancel = useCallback(() => {
      setShowTerminateConfirm(false);
    }, []);

    return (
      <ConsolePopupWrapper className={cssClassNames}>
        <div className="euiModal__flex modal-content">
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <h1>
                <EuiIcon type="console" size="xl" /> {title}
              </h1>
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <div className="console-holder">{children}</div>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton onClick={handleTerminateOnClick}>
              <FormattedMessage
                id="xpack.securitySolution.console.manager.popup.terminateLabel"
                defaultMessage="Terminate"
              />
            </EuiButton>
            <EuiButton onClick={onHide} fill>
              <FormattedMessage
                id="xpack.securitySolution.console.manager.popup.hideLabel"
                defaultMessage="hide"
              />
            </EuiButton>
          </EuiModalFooter>
        </div>
        {showTerminateConfirm && (
          <ConfirmTerminate
            onConfirm={handleTerminateOnConfirm}
            onCancel={handleTerminateOnCancel}
          />
        )}
      </ConsolePopupWrapper>
    );
  }
);
ConsolePopup.displayName = 'ConsolePopup';
