/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiButton, EuiDescriptionList } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { memo, useCallback } from 'react';

import { ErrorMessage } from './types';
import * as i18n from './translations';

export interface CallOutProps {
  handleDismissCallout: (
    e: React.MouseEvent,
    id: string,
    type: NonNullable<ErrorMessage['errorType']>
  ) => void;
  id: string;
  messages: ErrorMessage[];
  title: string;
  type: NonNullable<ErrorMessage['errorType']>;
}

const CallOutComponent = ({ handleDismissCallout, id, messages, title, type }: CallOutProps) => {
  const handleCallOut = useCallback((e) => handleDismissCallout(e, id, type), [
    handleDismissCallout,
    id,
    type,
  ]);

  return !isEmpty(messages) ? (
    <EuiCallOut
      title={title}
      color={type}
      iconType="gear"
      data-test-subj={`case-callout-${id}`}
      size="s"
    >
      <EuiDescriptionList data-test-subj={`callout-messages-${id}`} listItems={messages} />
      <EuiButton
        data-test-subj={`callout-dismiss-${id}`}
        color={type === 'success' ? 'secondary' : type}
        onClick={handleCallOut}
      >
        {i18n.ADD_CONNECTOR}
      </EuiButton>
    </EuiCallOut>
  ) : null;
};

export const CallOut = memo(CallOutComponent);
