/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

interface EmptyPageProps {
  message: string;
  title: string;
  actionLabel: string;
  actionUrl: string;
  'data-test-subj'?: string;
}

export const EmptyPage = pure<EmptyPageProps>(
  ({ actionLabel, actionUrl, message, title, ...rest }) => (
    <CenteredEmptyPrompt
      title={<h2>{title}</h2>}
      body={<p>{message}</p>}
      actions={
        <EuiButton href={actionUrl} color="primary" fill>
          {actionLabel}
        </EuiButton>
      }
      {...rest}
    />
  )
);

const CenteredEmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center;
`;
