/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './workspace_panel_wrapper.scss';
import './message_list.scss';

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiText,
  EuiButton,
  EuiIcon,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css, SerializedStyles } from '@emotion/react';
import { IconError, IconWarning } from '../custom_icons';
import { UserMessage } from '../../../types';

export const MessageList = ({
  messages,
  useSmallIconsOnButton,
  customButtonStyles,
}: {
  messages: UserMessage[];
  useSmallIconsOnButton?: boolean;
  customButtonStyles?: SerializedStyles;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  let warningCount = 0;
  let errorCount = 0;

  messages.forEach(({ severity }) => {
    if (severity === 'warning') {
      warningCount++;
    } else {
      errorCount++;
    }
  });

  const buttonLabel =
    errorCount > 0 && warningCount > 0
      ? i18n.translate('xpack.lens.messagesButton.label.errorsAndWarnings', {
          defaultMessage:
            '{errorCount} {errorCount, plural, one {error} other {errors}}, {warningCount} {warningCount, plural, one {warning} other {warnings}}',
          values: {
            errorCount,
            warningCount,
          },
        })
      : errorCount > 0
      ? i18n.translate('xpack.lens.messagesButton.label.errors', {
          defaultMessage: '{errorCount} {errorCount, plural, one {error} other {errors}}',
          values: {
            errorCount,
          },
        })
      : i18n.translate('xpack.lens.messagesButton.label.warnings', {
          defaultMessage: '{warningCount} {warningCount, plural, one {warning} other {warnings}}',
          values: {
            warningCount,
          },
        });

  const onButtonClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);
  return (
    <EuiPopover
      panelPaddingSize="none"
      button={
        <EuiToolTip content={buttonLabel}>
          <EuiButton
            minWidth={0}
            color={errorCount ? 'danger' : 'warning'}
            onClick={onButtonClick}
            className="lnsWorkspaceWarning__button"
            data-test-subj="lens-message-list-trigger"
            title={buttonLabel}
            css={customButtonStyles}
          >
            {errorCount > 0 && (
              <>
                <EuiIcon type={IconError} size={useSmallIconsOnButton ? 's' : undefined} />
                {errorCount}
              </>
            )}
            {warningCount > 0 && (
              <>
                <EuiIcon
                  type={IconWarning}
                  size={useSmallIconsOnButton ? 's' : undefined}
                  css={css`
                    margin-left: 4px;
                  `}
                />
                {warningCount}
              </>
            )}
          </EuiButton>
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <ul className="lnsWorkspaceWarningList">
        {messages.map((message, index) => (
          <li
            key={index}
            className="lnsWorkspaceWarningList__item"
            data-test-subj={`lens-message-list-${message.severity}`}
          >
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                {message.severity === 'error' ? (
                  <EuiIcon type={IconError} color="danger" />
                ) : (
                  <EuiIcon type={IconWarning} color="warning" />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={1} className="lnsWorkspaceWarningList__description">
                <EuiText size="s">{message.longMessage}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </li>
        ))}
      </ul>
    </EuiPopover>
  );
};
