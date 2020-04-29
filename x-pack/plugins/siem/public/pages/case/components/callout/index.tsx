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

interface CaseCallOutProps {
  title: string;
  message?: string;
  messages?: Array<{ title: string; description: JSX.Element }>;
}

const CaseCallOutComponent = ({ title, message, messages }: CaseCallOutProps) => {
  const [showCallOut, setShowCallOut] = useState(true);
  const handleCallOut = useCallback(() => setShowCallOut(false), [setShowCallOut]);

  return showCallOut ? (
    <>
      <EuiCallOut title={title} color="primary" iconType="gear" data-test-subj="case-call-out">
        {!isEmpty(messages) && (
          <EuiDescriptionList data-test-subj="callout-messages" listItems={messages} />
        )}
        {!isEmpty(message) && <p data-test-subj="callout-message">{message}</p>}
        <EuiButton data-test-subj="callout-dismiss" color="primary" onClick={handleCallOut}>
          {i18n.DISMISS_CALLOUT}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer />
    </>
  ) : null;
};

export const CaseCallOut = memo(CaseCallOutComponent);
