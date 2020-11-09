/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import {
  Stackframe as StackframeType,
  StackframeWithLineContext,
} from '../../../../typings/es_schemas/raw/fields/stackframe';
import {
  borderRadius,
  fontFamilyCode,
  fontSize,
} from '../../../style/variables';
import { Context } from './Context';
import { FrameHeading } from './FrameHeading';
import { Variables } from './Variables';
import { px, units } from '../../../style/variables';

const ContextContainer = styled.div<{ isLibraryFrame: boolean }>`
  position: relative;
  font-family: ${fontFamilyCode};
  font-size: ${fontSize};
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  border-radius: ${borderRadius};
  background: ${({ isLibraryFrame, theme }) =>
    isLibraryFrame
      ? theme.eui.euiColorEmptyShade
      : theme.eui.euiColorLightestShade};
`;

// Indent the non-context frames the same amount as the accordion control
const NoContextFrameHeadingWrapper = styled.div`
  margin-left: ${px(units.unit + units.half + units.quarter)};
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
