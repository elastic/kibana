/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiButton, EuiDescriptionList, EuiSpacer } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { memo, useCallback, useState } from 'react';

import * as i18n from './translations';

export * from './helpers';

interface ErrorMessage {
  title: string;
  description: JSX.Element;
  errorType?: 'primary' | 'success' | 'warning' | 'danger';
}

interface CaseCallOutProps {
  title: string;
  message?: string;
  messages?: ErrorMessage[];
}

const CaseCallOutComponent = ({ title, message, messages }: CaseCallOutProps) => {
  const [showCallOut, setShowCallOut] = useState(true);
  const handleCallOut = useCallback(() => setShowCallOut(false), [setShowCallOut]);
  let callOutMessages = messages ?? [];

  if (message) {
    callOutMessages = [
      ...callOutMessages,
      {
        title: '',
        description: <p data-test-subj="callout-message-primary">{message}</p>,
        errorType: 'primary',
      },
    ];
  }

  const groupedErrorMessages = callOutMessages.reduce((acc, currentMessage: ErrorMessage) => {
    const key = currentMessage.errorType == null ? 'primary' : currentMessage.errorType;
    return {
      ...acc,
      [key]: [...(acc[key] || []), currentMessage],
    };
  }, {} as { [key in NonNullable<ErrorMessage['errorType']>]: ErrorMessage[] });

  return showCallOut ? (
    <>
      {(Object.keys(groupedErrorMessages) as Array<keyof ErrorMessage['errorType']>).map((key) => (
        <React.Fragment key={key}>
          <EuiCallOut
            title={title}
            color={key}
            iconType="gear"
            data-test-subj={`case-call-out-${key}`}
          >
            {!isEmpty(groupedErrorMessages[key]) && (
              <EuiDescriptionList
                data-test-subj={`callout-messages-${key}`}
                listItems={groupedErrorMessages[key]}
              />
            )}
            <EuiButton
              data-test-subj={`callout-dismiss-${key}`}
              color={key === 'success' ? 'secondary' : key}
              onClick={handleCallOut}
            >
              {i18n.DISMISS_CALLOUT}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer />
        </React.Fragment>
      ))}
    </>
  ) : null;
};

export const CaseCallOut = memo(CaseCallOutComponent);
