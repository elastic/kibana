/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import { ExceptionStacktraceTitle } from './exception_stacktrace_title';

interface PlaintextStacktraceProps {
  codeLanguage?: string;
  message?: string;
  stacktrace?: string;
  type?: string;
}

export function PlaintextStacktrace({
  codeLanguage,
  message,
  stacktrace,
  type,
}: PlaintextStacktraceProps) {
  return (
    <>
      <ExceptionStacktraceTitle
        type={type}
        message={message}
        codeLanguage={codeLanguage}
      />
      {stacktrace && (
        <EuiCodeBlock isCopyable={true} language={codeLanguage}>
          {stacktrace}
        </EuiCodeBlock>
      )}
    </>
  );
}
