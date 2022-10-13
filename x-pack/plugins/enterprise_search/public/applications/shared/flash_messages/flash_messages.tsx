/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { useValues, useActions } from 'kea';

import { EuiCallOut, EuiSpacer, EuiGlobalToastList } from '@elastic/eui';

import { FLASH_MESSAGE_TYPES, DEFAULT_TOAST_TIMEOUT } from './constants';
import { FlashMessagesLogic } from './flash_messages_logic';

export const FlashMessages: React.FC = ({ children }) => {
  const { messages } = useValues(FlashMessagesLogic);

  return (
    <div aria-live="polite" data-test-subj="FlashMessages">
      {messages.map(({ type, message, description, iconType }, index) => (
        <Fragment key={index}>
          <EuiCallOut
            color={FLASH_MESSAGE_TYPES[type].color}
            iconType={iconType ?? FLASH_MESSAGE_TYPES[type].iconType}
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

/*
 * NOTE: Toasts are rendered at the highest app level (@see public/applications/index.tsx)
 * so that they don't rerender/reset their timers when navigating between pages,
 * and also to prevent z-index issues with flyouts and modals
 */
export const Toasts: React.FC = () => {
  const { toastMessages } = useValues(FlashMessagesLogic);
  const { dismissToastMessage } = useActions(FlashMessagesLogic);

  return (
    <EuiGlobalToastList
      toasts={toastMessages}
      dismissToast={dismissToastMessage}
      toastLifeTimeMs={DEFAULT_TOAST_TIMEOUT}
    />
  );
};
