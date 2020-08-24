/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { useValues } from 'kea';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { FlashMessagesLogic, IFlashMessagesLogicValues } from './flash_messages_logic';

type EuiColor = 'primary' | 'success' | 'warning' | 'danger';
const FLASH_MESSAGE_TYPES = {
  success: { color: 'success' as EuiColor, icon: 'check' },
  info: { color: 'primary' as EuiColor, icon: 'iInCircle' },
  warning: { color: 'warning' as EuiColor, icon: 'alert' },
  error: { color: 'danger' as EuiColor, icon: 'cross' },
};

export const FlashMessages: React.FC = ({ children }) => {
  const { messages } = useValues(FlashMessagesLogic) as IFlashMessagesLogicValues;

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
