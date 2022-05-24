/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, ReactNode, useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
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
  isHidden: boolean;
  onTerminate: () => void;
  onHide: () => void;
  title?: ReactNode;
}>;

export const ConsolePopup = memo<ConsolePopupProps>(
  ({ children, isHidden, title = '', onTerminate, onHide }) => {
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
      <ConsolePopupWrapper className={cssClassNames} data-test-subj="consolePopupWrapper">
        <div className="euiModal__flex modal-content">
          {!isHidden && (
            <EuiModalHeader data-test-subj="consolePopupHeader">
              <EuiModalHeaderTitle>
                <h1>
                  <EuiIcon type="console" size="xl" /> {title}
                </h1>
              </EuiModalHeaderTitle>
            </EuiModalHeader>
          )}

          {/*
            IMPORTANT:  The Modal body (below) is always shown. This is how the command history
                        of each command is persisted - by allowing the consoles to still be
                        rendered (Console takes care of hiding it own UI in this case)
          */}
          <EuiModalBody data-test-subj="consolePopupBody">
            <div className="console-holder">{children}</div>
          </EuiModalBody>

          {!isHidden && (
            <EuiModalFooter>
              <EuiButtonEmpty
                color="danger"
                onClick={handleTerminateOnClick}
                data-test-subj="consolePopupTerminateButton"
              >
                <FormattedMessage
                  id="xpack.securitySolution.console.manager.popup.terminateLabel"
                  defaultMessage="Terminate"
                />
              </EuiButtonEmpty>
              <EuiButton onClick={onHide} fill data-test-subj="consolePopupHideButton">
                <FormattedMessage
                  id="xpack.securitySolution.console.manager.popup.hideLabel"
                  defaultMessage="hide"
                />
              </EuiButton>
            </EuiModalFooter>
          )}
        </div>

        {!isHidden && showTerminateConfirm && (
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
