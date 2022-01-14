/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { Exception } from '../../../../../typings/es_schemas/raw/error_raw';
import { Stacktrace } from '../../../shared/stacktrace';
import { CauseStacktrace } from '../../../shared/stacktrace/cause_stacktrace';

interface ExceptionStacktraceProps {
  codeLanguage?: string;
  exceptions: Exception[];
}

export function ExceptionStacktrace({
  codeLanguage,
  exceptions,
}: ExceptionStacktraceProps) {
  const title = exceptions[0]?.message;

  return (
    <>
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>
      {exceptions.map((ex, index) => {
        return index === 0 ? (
          <Stacktrace
            key={index}
            stackframes={ex.stacktrace}
            codeLanguage={codeLanguage}
          />
        ) : (
          <CauseStacktrace
            codeLanguage={codeLanguage}
            key={index}
            id={index.toString()}
            message={ex.message}
            stackframes={ex.stacktrace}
          />
        );
      })}
    </>
  );
}
