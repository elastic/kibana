/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './workspace_panel_wrapper.scss';
import './warnings_popover.scss';

import React, { useState } from 'react';
import { EuiPopover, EuiText, EuiButton, EuiIcon } from '@elastic/eui';
import { UserMessage } from '../../../types';

import errorSvg from '../../../assets/error.svg';
import warningSvg from '../../../assets/warning.svg';

// const IconError = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     width="16"
//     height="16"
//     viewBox="0 0 16 16"
//     aria-labelledby={titleId}
//     fill="none"
//     {...props}
//   >
//     {title ? <title id={titleId}>{title}</title> : null}
//     <path
//       fillRule="evenodd"
//       d="M10 1a1 1 0 0 1 .707.293l4 4A1 1 0 0 1 15 6v5a1 1 0 0 1-.293.707l-4 4A1 1 0 0 1 10 16H5a1 1 0 0 1-.707-.293l-4-4A1 1 0 0 1 0 11V6a1 1 0 0 1 .293-.707l4-4A1 1 0 0 1 5 1h5ZM4.146 5.146a.5.5 0 0 1 .708 0L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708.708L8.207 8.5l2.647 2.646a.5.5 0 0 1-.708.708L7.5 9.207l-2.646 2.647a.5.5 0 0 1-.708-.708L6.793 8.5 4.146 5.854a.5.5 0 0 1 0-.708Z"
//     />
//   </svg>
// );

// const IconWarning = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     width="16"
//     height="16"
//     viewBox="0 0 16 16"
//     aria-labelledby={titleId}
//     fill="none"
//     {...props}
//   >
//     {title ? <title id={titleId}>{title}</title> : null}
//     <path d="m8.55 9.502.35-3.507a.905.905 0 1 0-1.8 0l.35 3.507a.552.552 0 0 0 1.1 0ZM9 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
//     <path d="M8.864 1.496a1 1 0 0 0-1.728 0l-7 12A1 1 0 0 0 1 15h14a1 1 0 0 0 .864-1.504l-7-12ZM1 14 8 2l7 12H1Z" />
//   </svg>
// );

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

  const onButtonClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);
  return (
    <EuiPopover
      panelPaddingSize="none"
      button={
        <EuiButton
          minWidth={0}
          color={errorCount ? 'danger' : 'warning'}
          onClick={onButtonClick}
          className="lnsWorkspaceWarning__button"
          data-test-subj="lens-editor-warning-button"
        >
          {errorCount > 0 && (
            <>
              <EuiIcon type={errorSvg} />
              {errorCount}
            </>
          )}
          {warningCount > 0 && (
            <>
              <EuiIcon type={warningSvg} />
              {warningCount}
            </>
          )}
        </EuiButton>
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
