/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';

export interface ExceptionStackTraceTitleProps {
  message?: string;
  type?: string;
  codeLanguage?: string;
}

export function ExceptionStacktraceTitle({
  message,
  type,
  codeLanguage,
}: ExceptionStackTraceTitleProps) {
  let title = message;

  switch (codeLanguage?.toLowerCase()) {
    case 'c#':
    case 'javascript':
    case 'php':
    case 'python':
      title = `${type}: ${message}`;
      break;
    case 'java':
      title = message ? `${type}: ${message}` : type;
      break;
    case 'ruby':
      title = `${type} (${message ? message : type})`;
      break;
    case 'go':
    default:
      break;
  }

  return (
    <EuiTitle size="xs">
      <h4>{title}</h4>
    </EuiTitle>
  );
}
