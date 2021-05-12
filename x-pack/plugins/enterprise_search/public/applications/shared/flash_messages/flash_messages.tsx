/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { useValues, useActions } from 'kea';

import { EuiCallOut, EuiSpacer, EuiGlobalToastList } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FLASH_MESSAGE_TYPES, DEFAULT_TOAST_TIMEOUT } from './constants';
import { FlashMessagesLogic } from './flash_messages_logic';

export const FlashMessages: React.FC = ({ children }) => (
  <>
    <Callouts>{children}</Callouts>
    <Toasts />
  </>
);

export const Callouts: React.FC = ({ children }) => {
  const { messages } = useValues(FlashMessagesLogic);

  return (
    <div
      aria-live="polite"
      role="region"
      aria-label={i18n.translate('xpack.enterpriseSearch.flashMessages.regionAriaLabel', {
        defaultMessage: 'Flash messages',
      })}
      data-test-subj="FlashMessages"
    >
      {messages.map(({ type, message, description }, index) => (
        <Fragment key={index}>
          <EuiCallOut
            color={FLASH_MESSAGE_TYPES[type].color}
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
