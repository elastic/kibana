/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { memo, useCallback, useMemo } from 'react';

import { CallOut } from './callout';
import { ErrorMessage } from './types';
import { createCalloutId } from './helpers';
import { CasesNavigation } from '../../links';

export * from './helpers';

export interface CaseCallOutProps {
  configureCasesNavigation: CasesNavigation;
  hasConnectors: boolean;
  messages?: ErrorMessage[];
  onEditClick: () => void;
}

type GroupByTypeMessages = {
  [key in NonNullable<ErrorMessage['errorType']>]: {
    messagesId: string[];
    messages: ErrorMessage[];
  };
};
const CaseCallOutComponent = ({
  configureCasesNavigation,
  hasConnectors,
  onEditClick,
  messages = [],
}: CaseCallOutProps) => {
  const handleCallOut = useCallback(
    (e) => {
      // if theres connectors open dropdown editor
      // if no connectors, redirect to create case page
      if (hasConnectors) {
        onEditClick();
      } else {
        configureCasesNavigation.onClick(e);
      }
    },
    [hasConnectors, onEditClick, configureCasesNavigation]
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
                handleButtonClick={handleCallOut}
                id={id}
                messages={groupedByTypeErrorMessages[type].messages}
                type={type}
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
