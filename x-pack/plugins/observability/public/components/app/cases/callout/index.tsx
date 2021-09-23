/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { memo, useCallback, useState, useMemo } from 'react';

import { CallOut } from './callout';
import { ErrorMessage } from './types';
import { createCalloutId } from './helpers';
import { useMessagesStorage } from '../../../../hooks/use_messages_storage';
import { observabilityAppId } from '../../../../../common';

export * from './helpers';

export interface CaseCallOutProps {
  title: string;
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

function CaseCallOutComponent({ title, messages = [] }: CaseCallOutProps) {
  const { getMessages, addMessage } = useMessagesStorage();

  const caseMessages = useMemo(() => getMessages(observabilityAppId), [getMessages]);
  const dismissedCallouts = useMemo(
    () =>
      caseMessages.reduce<CalloutVisibility>(
        (acc: CalloutVisibility, id) => ({
          ...acc,
          [id]: false,
        }),
        {}
      ),
    [caseMessages]
  );

  const [calloutVisibility, setCalloutVisibility] = useState(dismissedCallouts);
  const handleCallOut = useCallback(
    (id, type) => {
      setCalloutVisibility((prevState) => ({ ...prevState, [id]: false }));
      if (type === 'primary') {
        addMessage(observabilityAppId, id);
      }
    },
    [setCalloutVisibility, addMessage]
  );

  const groupedByTypeErrorMessages = useMemo(
    () =>
      messages.reduce<GroupByTypeMessages>(
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
      ),
    [messages]
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
}

export const CaseCallOut = memo(CaseCallOutComponent);
