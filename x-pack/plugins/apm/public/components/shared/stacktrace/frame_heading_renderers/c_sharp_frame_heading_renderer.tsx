/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FrameHeadingRendererProps } from './';
import { DefaultFrameHeadingRenderer } from './default_frame_heading_renderer';

export function CSharpFrameHeadingRenderer({
  stackframe,
  fileDetailComponent: FileDetail,
}: FrameHeadingRendererProps) {
  const { classname, filename, function: fn } = stackframe;
  const lineNumber = stackframe.line?.number ?? 0;

  if (classname) {
    return (
      <>
        <FileDetail>{classname}</FileDetail>
        {' in '}
        <FileDetail>{fn}</FileDetail>
        {' in '}
        <FileDetail>{filename}</FileDetail>
        {lineNumber > 0 && (
          <>
            {' at '}
            <FileDetail>line {lineNumber}</FileDetail>
          </>
        )}
      </>
    );
  } else {
    return (
      <DefaultFrameHeadingRenderer
        fileDetailComponent={FileDetail}
        stackframe={stackframe}
      />
    );
  }
}
