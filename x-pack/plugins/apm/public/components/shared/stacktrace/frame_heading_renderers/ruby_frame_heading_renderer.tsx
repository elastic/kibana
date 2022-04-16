/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FrameHeadingRendererProps } from '.';

export function RubyFrameHeadingRenderer({
  stackframe,
  fileDetailComponent: FileDetail,
}: FrameHeadingRendererProps) {
  const { filename, function: fn } = stackframe;
  const lineNumber = stackframe.line?.number ?? 0;

  return (
    <>
      <FileDetail>
        {filename}
        {lineNumber > 0 && `:${lineNumber}`}
      </FileDetail>
      {' in '}
      <FileDetail>`{fn}&#39;</FileDetail>
    </>
  );
}
