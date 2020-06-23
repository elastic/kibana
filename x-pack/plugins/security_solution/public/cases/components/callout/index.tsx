/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { memo, useCallback, useState } from 'react';

import { useMessagesStorage } from '../../../common/containers/local_storage/use_messages_storage';
import { CallOut } from './callout';
import { ErrorMessage } from './types';
import { createCalloutId } from './helpers';

export * from './helpers';

interface CaseCallOutProps {
  title: string;
  message?: string;
  messages?: ErrorMessage[];
}

type GroupByTypeMessages = {
  [key in NonNullable<ErrorMessage['errorType']>]: {
    messagesId: string[];
    messages: ErrorMessage[];
  };
};

interface CalloutVisibility {
  [index: string]: boolean;
}

const CaseCallOutComponent = ({ title, message, messages }: CaseCallOutProps) => {
  const { getMessages, addMessage } = useMessagesStorage();
  const dismissedCallouts = getMessages('case').reduce<CalloutVisibility>(
    (acc, id) => ({
      ...acc,
      [id]: false,
    }),
    {}
  );

  const [calloutVisibility, setCalloutVisibility] = useState(dismissedCallouts);
  const handleCallOut = useCallback(
    (id, type) => {
      setCalloutVisibility((prevState) => ({ ...prevState, [id]: false }));
      if (type === 'primary') {
        addMessage('case', id);
      }
    },
    [setCalloutVisibility, addMessage]
  );

  let callOutMessages = messages ?? [];

  if (message) {
    callOutMessages = [
      ...callOutMessages,
      {
        id: 'generic-message-error',
        title: '',
        description: <p data-test-subj="callout-message-primary">{message}</p>,
        errorType: 'primary',
      },
    ];
  }

  const groupedByTypeErrorMessages = callOutMessages.reduce<GroupByTypeMessages>(
    (acc: GroupByTypeMessages, currentMessage: ErrorMessage) => {
      const type = currentMessage.errorType == null ? 'primary' : currentMessage.errorType;
      return {
        ...acc,
        [type]: {
          messagesId: [...(acc[type]?.messagesId ?? []), currentMessage.id],
          messages: [...(acc[type]?.messages ?? []), currentMessage],
        },
      };
    },
    {} as GroupByTypeMessages
  );

  return (
    <>
      {(Object.keys(groupedByTypeErrorMessages) as Array<keyof ErrorMessage['errorType']>).map(
        (type: NonNullable<ErrorMessage['errorType']>) => {
          const id = createCalloutId(groupedByTypeErrorMessages[type].messagesId);
          return (
            <React.Fragment key={id}>
              <CallOut
                id={id}
                type={type}
                title={title}
                messages={groupedByTypeErrorMessages[type].messages}
                showCallOut={calloutVisibility[id] ?? true}
                handleDismissCallout={handleCallOut}
              />
              <EuiSpacer />
            </React.Fragment>
          );
        }
      )}
    </>
  );
};

export const CaseCallOut = memo(CaseCallOutComponent);
