/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FrameHeadingRendererProps } from './';

export function JavaScriptFrameHeadingRenderer({
  stackframe,
  fileDetailComponent: FileDetail,
}: FrameHeadingRendererProps) {
  const { classname, filename, function: fn } = stackframe;
  const lineNumber = stackframe.line?.number ?? 0;
  const columnNumber = stackframe.line?.column ?? 0;

  return (
    <>
      at{' '}
      <FileDetail>
        {classname && `${classname}.`}
        {fn}
      </FileDetail>{' '}
      (
      <FileDetail>
        {filename}
        {lineNumber > 0 && `:${lineNumber}`}
        {lineNumber > 0 && columnNumber > 0 && `:${columnNumber}`}
      </FileDetail>
      )
    </>
  );
}
