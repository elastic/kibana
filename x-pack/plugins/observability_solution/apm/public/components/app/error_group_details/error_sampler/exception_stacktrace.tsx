/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Exception } from '../../../../../typings/es_schemas/raw/error_raw';
import { Stacktrace } from '../../../shared/stacktrace';
import { CauseStacktrace } from '../../../shared/stacktrace/cause_stacktrace';
import { ExceptionStacktraceTitle } from './exception_stacktrace_title';

interface ExceptionStacktraceProps {
  codeLanguage?: string;
  exceptions: Exception[];
}

export function ExceptionStacktrace({ codeLanguage, exceptions }: ExceptionStacktraceProps) {
  const message = exceptions[0]?.message;
  const type = exceptions[0]?.type;

  return (
    <>
      <ExceptionStacktraceTitle type={type} message={message} codeLanguage={codeLanguage} />
      {exceptions.map((ex, index) => {
        return index === 0 ? (
          <Stacktrace key={index} stackframes={ex.stacktrace} codeLanguage={codeLanguage} />
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
