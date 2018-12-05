/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

interface EmptyPageProps {
  message: string;
  title: string;
  actions: React.ReactNode;
  'data-test-subj'?: string;
}

export const EmptyPage: React.SFC<EmptyPageProps> = ({ actions, message, title, ...rest }) => (
  <CenteredEmptyPrompt
    title={<h2>{title}</h2>}
    body={<p>{message}</p>}
    actions={actions}
    {...rest}
  />
);

const CenteredEmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center;
`;
