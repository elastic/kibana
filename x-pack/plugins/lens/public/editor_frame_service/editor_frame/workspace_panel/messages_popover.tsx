/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './workspace_panel_wrapper.scss';
import './messages_popover.scss';

import React, { useState } from 'react';
import { EuiPopover, EuiText, EuiButton, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IconError, IconWarning } from '../custom_icons';
import { UserMessage } from '../../../types';

export const MessagesPopover = ({ messages }: { messages: UserMessage[] }) => {
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
            data-test-subj="lens-editor-warning-button"
            title={buttonLabel}
          >
            {errorCount > 0 && (
              <>
                <EuiIcon type={IconError} />
                {errorCount}
              </>
            )}
            {warningCount > 0 && (
              <>
                <EuiIcon type={IconWarning} />
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
            data-test-subj="lens-editor-warning"
          >
            <EuiText size="s">{message.longMessage}</EuiText>
          </li>
        ))}
      </ul>
    </EuiPopover>
  );
};
