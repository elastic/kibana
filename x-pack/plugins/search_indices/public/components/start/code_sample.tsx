/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// Disabled so we can track the on copy event by adding an onClick to a div
/* eslint-disable jsx-a11y/click-events-have-key-events */

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
  onCodeCopyClick?: React.MouseEventHandler<HTMLElement>;
}

export const CodeSample = ({ title, language, code, onCodeCopyClick }: CodeSampleProps) => {
  const onCodeClick = React.useCallback(
    (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
      if (onCodeCopyClick === undefined) return;
      if (e.target instanceof HTMLElement) {
        if (e.target.dataset?.testSubj === 'euiCodeBlockCopy') {
          onCodeCopyClick(e);
        }
      }
    },
    [onCodeCopyClick]
  );

  return (
    <EuiFlexItem>
      <EuiText size="s">
        <strong>{title}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiThemeProvider colorMode="dark">
        <EuiPanel color="subdued" paddingSize="none" hasShadow={false}>
          <div onClick={onCodeClick}>
            <EuiCodeBlock
              language={language}
              fontSize="m"
              paddingSize="m"
              isCopyable
              transparentBackground
            >
              {code}
            </EuiCodeBlock>
          </div>
        </EuiPanel>
      </EuiThemeProvider>
    </EuiFlexItem>
  );
};
