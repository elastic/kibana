/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { useValues } from 'kea';
import { EuiCallOut, EuiCallOutProps, EuiSpacer } from '@elastic/eui';

import { FlashMessagesLogic } from './flash_messages_logic';

const FLASH_MESSAGE_TYPES = {
  success: { color: 'success' as EuiCallOutProps['color'], icon: 'check' },
  info: { color: 'primary' as EuiCallOutProps['color'], icon: 'iInCircle' },
  warning: { color: 'warning' as EuiCallOutProps['color'], icon: 'alert' },
  error: { color: 'danger' as EuiCallOutProps['color'], icon: 'cross' },
};

export const FlashMessages: React.FC = ({ children }) => {
  const { messages } = useValues(FlashMessagesLogic);

  // If we have no messages to display, do not render the element at all
  if (!messages.length) return null;

  return (
    <div data-test-subj="FlashMessages">
      {messages.map(({ type, message, description }, index) => (
        <Fragment key={index}>
          <EuiCallOut
            color={FLASH_MESSAGE_TYPES[type].color}
            iconType={FLASH_MESSAGE_TYPES[type].icon}
            title={message}
          >
            {description}
          </EuiCallOut>
          <EuiSpacer />
        </Fragment>
      ))}
      {children}
    </div>
  );
};
