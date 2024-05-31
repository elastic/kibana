/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment } from 'react';

import { EuiCallOut, EuiCodeBlock, EuiSpacer } from '@elastic/eui';

import type { FormMessage } from '../../../analytics_management/hooks/use_create_analytics_form/state';

interface Props {
  messages: FormMessage[];
}

export const Messages: FC<Props> = ({ messages }) => {
  return (
    <>
      {messages.map((requestMessage, i) => (
        <Fragment key={i}>
          <EuiCallOut
            data-test-subj={`analyticsWizardCreationCallout_${i}`}
            title={requestMessage.message}
            color={requestMessage.error !== undefined ? 'danger' : 'primary'}
            iconType={requestMessage.error !== undefined ? 'error' : 'checkInCircleFilled'}
            size="s"
          >
            {requestMessage.error !== undefined && (
              <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
                {requestMessage.error}
              </EuiCodeBlock>
            )}
          </EuiCallOut>
          <EuiSpacer size="s" />
        </Fragment>
      ))}
    </>
  );
};
