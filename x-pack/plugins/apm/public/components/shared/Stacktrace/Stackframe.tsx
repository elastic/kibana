/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { IStackframe } from 'x-pack/plugins/apm/typings/es_schemas/APMDoc';
import { CodePreview } from '../CodePreview';
import { FrameHeading } from './FrameHeading';

interface Props {
  codeLanguage?: string;
  stackframe: IStackframe;
  isLibraryFrame?: boolean;
}

export function Stackframe({
  codeLanguage,
  stackframe,
  isLibraryFrame = false
}: Props) {
  if (hasSourceLines(stackframe)) {
    return (
      <CodePreview
        stackframe={stackframe}
        isLibraryFrame={isLibraryFrame}
        codeLanguage={codeLanguage}
      />
    );
  }

  return (
    <FrameHeading stackframe={stackframe} isLibraryFrame={isLibraryFrame} />
  );
}

export function hasSourceLines(stackframe: IStackframe) {
  const hasLineContext = stackframe.line.context != null;
  const hasPrePostLine =
    stackframe.context &&
    (stackframe.context.post != null || stackframe.context.pre != null);

  return hasPrePostLine || hasLineContext;
}
