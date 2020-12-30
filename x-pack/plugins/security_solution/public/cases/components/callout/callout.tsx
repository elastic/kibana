/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiButton, EuiDescriptionList } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { memo, useCallback } from 'react';

import { ErrorMessage } from './types';
import * as i18n from './translations';

export interface CallOutProps {
  id: string;
  type: NonNullable<ErrorMessage['errorType']>;
  title: string;
  messages: ErrorMessage[];
  showCallOut: boolean;
  handleDismissCallout: (id: string, type: NonNullable<ErrorMessage['errorType']>) => void;
}

const CallOutComponent = ({
  id,
  type,
  title,
  messages,
  showCallOut,
  handleDismissCallout,
}: CallOutProps) => {
  const handleCallOut = useCallback(() => handleDismissCallout(id, type), [
    handleDismissCallout,
    id,
    type,
  ]);

  return showCallOut ? (
    <EuiCallOut title={title} color={type} iconType="gear" data-test-subj={`case-callout-${id}`}>
      {!isEmpty(messages) && (
        <EuiDescriptionList data-test-subj={`callout-messages-${id}`} listItems={messages} />
      )}
      <EuiButton
        data-test-subj={`callout-dismiss-${id}`}
        color={type === 'success' ? 'secondary' : type}
        onClick={handleCallOut}
      >
        {i18n.DISMISS_CALLOUT}
      </EuiButton>
    </EuiCallOut>
  ) : null;
};

export const CallOut = memo(CallOutComponent);
