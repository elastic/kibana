/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiThemeProvider,
} from '@elastic/eui';

export interface CodeSampleProps {
  title: string;
  language: string;
  code: string;
}

export const CodeSample = ({ title, language, code }: CodeSampleProps) => {
  return (
    <EuiFlexItem>
      <EuiText size="s">
        <strong>{title}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiThemeProvider colorMode="dark">
        <EuiPanel color="subdued" paddingSize="none" hasShadow={false}>
          <EuiCodeBlock
            language={language}
            fontSize="m"
            paddingSize="m"
            isCopyable
            transparentBackground
          >
            {code}
          </EuiCodeBlock>
        </EuiPanel>
      </EuiThemeProvider>
    </EuiFlexItem>
  );
};
