/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, type EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import {
  Stackframe as StackframeType,
  StackframeWithLineContext,
} from '../../../../typings/es_schemas/raw/fields/stackframe';
import { Context } from './context';
import { FrameHeading } from './frame_heading';
import { Variables } from './variables';

const ContextContainer = euiStyled.div<{ isLibraryFrame: boolean; euiTheme: EuiThemeComputed }>`
  position: relative;
  font-family: ${({ euiTheme }) => euiTheme.font.familyCode};
  font-size: ${({ euiTheme }) => euiTheme.size.s};
  border: 1px solid ${({ euiTheme }) => euiTheme.colors.lightShade};
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.small};
  background: ${({ isLibraryFrame, euiTheme }) =>
    isLibraryFrame ? euiTheme.colors.emptyShade : euiTheme.colors.lightestShade};
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
  const { euiTheme } = useEuiTheme();
  if (!hasLineContext(stackframe)) {
    return (
      <NoContextFrameHeadingWrapper>
        <FrameHeading
          codeLanguage={codeLanguage}
          stackframe={stackframe}
          isLibraryFrame={isLibraryFrame}
          idx={id}
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
          idx={id}
        />
      }
      id={id}
      initialIsOpen={initialIsOpen}
    >
      <ContextContainer euiTheme={euiTheme} isLibraryFrame={isLibraryFrame}>
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

function hasLineContext(stackframe: StackframeType): stackframe is StackframeWithLineContext {
  return Object.hasOwn(stackframe.line ?? {}, 'context') || false;
}
