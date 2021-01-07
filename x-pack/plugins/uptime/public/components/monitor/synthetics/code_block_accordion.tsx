/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiCodeBlock } from '@elastic/eui';
import React, { FC } from 'react';

interface Props {
  buttonContent: string;
  id?: string;
  language: 'html' | 'javascript';
  overflowHeight: number;
}

/**
 * Utility for showing `EuiAccordions` with code blocks which we use frequently in synthetics to display
 * stack traces, long error messages, and synthetics journey code.
 */
export const CodeBlockAccordion: FC<Props> = ({
  buttonContent,
  children,
  id,
  language,
  overflowHeight,
}) => {
  return children && id ? (
    <EuiAccordion id={id} buttonContent={buttonContent}>
      <EuiCodeBlock isCopyable={true} overflowHeight={overflowHeight} language={language}>
        {children}
      </EuiCodeBlock>
    </EuiAccordion>
  ) : null;
};
