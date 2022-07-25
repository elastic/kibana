/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import {
  Stackframe as StackframeType,
  StackframeWithLineContext,
} from '../../../../typings/es_schemas/raw/fields/stackframe';
import { Context } from './context';
import { FrameHeading } from './frame_heading';
import { Variables } from './variables';

const ContextContainer = euiStyled.div<{ isLibraryFrame: boolean }>`
  position: relative;
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  border-radius: ${({ theme }) => theme.eui.euiBorderRadiusSmall};
  background: ${({ isLibraryFrame, theme }) =>
    isLibraryFrame
      ? theme.eui.euiColorEmptyShade
      : theme.eui.euiColorLightestShade};
`;

// Indent the non-context frames the same amount as the accordion control
const NoContextFrameHeadingWrapper = euiStyled.div`
  margin-left: 28px;
`;

interface Props {
  stackframe: StackframeType;
  codeLanguage?: string;
  id: string;
  initialIsOpen?: boolean;
  isLibraryFrame?: boolean;
}

export function Stackframe({
  stackframe,
  codeLanguage,
  id,
  initialIsOpen = false,
  isLibraryFrame = false,
}: Props) {
  if (!hasLineContext(stackframe)) {
    return (
      <NoContextFrameHeadingWrapper>
        <FrameHeading
          codeLanguage={codeLanguage}
          stackframe={stackframe}
          isLibraryFrame={isLibraryFrame}
        />
      </NoContextFrameHeadingWrapper>
    );
  }

  return (
    <EuiAccordion
      buttonContent={
        <FrameHeading
          codeLanguage={codeLanguage}
          stackframe={stackframe}
          isLibraryFrame={isLibraryFrame}
        />
      }
      id={id}
      initialIsOpen={initialIsOpen}
    >
      <ContextContainer isLibraryFrame={isLibraryFrame}>
        <Context
          stackframe={stackframe}
          codeLanguage={codeLanguage}
          isLibraryFrame={isLibraryFrame}
        />
      </ContextContainer>
      <Variables vars={stackframe.vars} />
    </EuiAccordion>
  );
}

function hasLineContext(
  stackframe: StackframeType
): stackframe is StackframeWithLineContext {
  return stackframe.line?.hasOwnProperty('context') || false;
}
