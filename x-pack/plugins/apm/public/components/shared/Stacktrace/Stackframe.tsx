/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import {
  IStackframe,
  IStackframeWithLineContext
} from '../../../../typings/es_schemas/Stackframe';
import { borderRadius, colors, fontFamilyCode } from '../../../style/variables';
import { FrameHeading } from '../Stacktrace/FrameHeading';
import { Context } from './Context';
import { Variables } from './Variables';

const CodeHeader = styled.div`
  border-bottom: 1px solid ${colors.gray4};
  border-radius: ${borderRadius} ${borderRadius} 0 0;
`;

const Container = styled.div<{ isLibraryFrame: boolean }>`
  position: relative;
  font-family: ${fontFamilyCode};
  border: 1px solid ${colors.gray4};
  border-radius: ${borderRadius};
  background: ${props => (props.isLibraryFrame ? colors.white : colors.gray5)};
`;

interface Props {
  stackframe: IStackframe;
  codeLanguage?: string;
  isLibraryFrame?: boolean;
}

export function Stackframe({
  stackframe,
  codeLanguage,
  isLibraryFrame = false
}: Props) {
  if (!hasLineContext(stackframe)) {
    return (
      <FrameHeading stackframe={stackframe} isLibraryFrame={isLibraryFrame} />
    );
  }

  return (
    <Container isLibraryFrame={isLibraryFrame}>
      <CodeHeader>
        <FrameHeading stackframe={stackframe} isLibraryFrame={isLibraryFrame} />
      </CodeHeader>

      <Context
        stackframe={stackframe}
        codeLanguage={codeLanguage}
        isLibraryFrame={isLibraryFrame}
      />

      <Variables vars={stackframe.vars} />
    </Container>
  );
}

function hasLineContext(
  stackframe: IStackframe
): stackframe is IStackframeWithLineContext {
  return stackframe.line.context != null;
}
