/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';

import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';

interface NoIndicesProps {
  message: string;
  title: string;
  actions: React.ReactNode;
  'data-test-subj'?: string;
}

export const NoIndices: React.FC<NoIndicesProps> = ({ actions, message, title, ...rest }) => (
  <CenteredEmptyPrompt
    title={<h2>{title}</h2>}
    body={<p>{message}</p>}
    actions={actions}
    {...rest}
  />
);

const CenteredEmptyPrompt = euiStyled(EuiEmptyPrompt)`
  align-self: center;
`;
