/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';

import { euiStyled } from '@kbn/kibana-react-plugin/common';

interface NoDataProps {
  titleText: string;
  bodyText: string;
  refetchText: string;
  onRefetch: () => void;
  testString?: string;
}

export const NoData: React.FC<NoDataProps> = ({
  titleText,
  bodyText,
  refetchText,
  onRefetch,
  testString,
}) => (
  <CenteredEmptyPrompt
    title={<h2>{titleText}</h2>}
    titleSize="m"
    body={<p>{bodyText}</p>}
    actions={
      <EuiButton iconType="refresh" color="primary" fill onClick={onRefetch}>
        {refetchText}
      </EuiButton>
    }
    data-test-subj={testString}
  />
);

const CenteredEmptyPrompt = euiStyled(EuiEmptyPrompt)`
  align-self: center;
`;
