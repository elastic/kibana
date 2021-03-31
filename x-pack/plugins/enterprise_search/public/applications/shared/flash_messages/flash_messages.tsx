/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { useValues } from 'kea';

import { EuiCallOut, EuiCallOutProps, EuiSpacer } from '@elastic/eui';

import { FLASH_MESSAGE_TYPES } from './constants';
import { FlashMessagesLogic } from './flash_messages_logic';

export const FlashMessages: React.FC = ({ children }) => {
  const { messages } = useValues(FlashMessagesLogic);

  // If we have no messages to display, do not render the element at all
  if (!messages.length) return null;

  return (
    <div data-test-subj="FlashMessages">
      {messages.map(({ type, message, description }, index) => (
        <Fragment key={index}>
          <EuiCallOut
            color={FLASH_MESSAGE_TYPES[type].color as EuiCallOutProps['color']}
            iconType={FLASH_MESSAGE_TYPES[type].iconType}
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
