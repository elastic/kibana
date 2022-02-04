/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiButton, EuiDescriptionList } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { memo, useCallback, useMemo } from 'react';

import { CLOSED_CASE_PUSH_ERROR_ID, ErrorMessage } from './types';
import * as i18n from './translations';

export interface CallOutProps {
  handleButtonClick: (
    e: React.MouseEvent,
    id: string,
    type: NonNullable<ErrorMessage['errorType']>
  ) => void;
  id: string;
  messages: ErrorMessage[];
  type: NonNullable<ErrorMessage['errorType']>;
  hasLicenseError: boolean;
}

const CallOutComponent = ({
  handleButtonClick,
  id,
  messages,
  type,
  hasLicenseError,
}: CallOutProps) => {
  const handleCallOut = useCallback(
    (e) => handleButtonClick(e, id, type),
    [handleButtonClick, id, type]
  );

  const isCaseClosed = useMemo(
    () => messages.map((m) => m.id).includes(CLOSED_CASE_PUSH_ERROR_ID),
    [messages]
  );

  return !isEmpty(messages) ? (
    <EuiCallOut
      title={
        isCaseClosed
          ? i18n.PUSH_DISABLE_BECAUSE_CASE_CLOSED_TITLE
          : hasLicenseError
          ? i18n.PUSH_DISABLE_BY_LICENSE_TITLE
          : i18n.ERROR_PUSH_SERVICE_CALLOUT_TITLE
      }
      color={type}
      iconType="gear"
      data-test-subj={`case-callout-${id}`}
      size="s"
    >
      <EuiDescriptionList data-test-subj={`callout-messages-${id}`} listItems={messages} />
      {!isCaseClosed && !hasLicenseError && (
        <EuiButton
          data-test-subj={`callout-onclick-${id}`}
          color={type === 'success' ? 'success' : type}
          onClick={handleCallOut}
        >
          {i18n.ADD_CONNECTOR}
        </EuiButton>
      )}
    </EuiCallOut>
  ) : null;
};
CallOutComponent.displayName = 'CallOut';

export const CallOut = memo(CallOutComponent);
