/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { size } from 'lodash';
import { tint } from 'polished';
import React from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import javascript from 'react-syntax-highlighter/dist/cjs/languages/hljs/javascript';
import python from 'react-syntax-highlighter/dist/cjs/languages/hljs/python';
import ruby from 'react-syntax-highlighter/dist/cjs/languages/hljs/ruby';
import xcode from 'react-syntax-highlighter/dist/cjs/styles/hljs/xcode';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { StackframeWithLineContext } from '../../../../typings/es_schemas/raw/fields/stackframe';

SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('ruby', ruby);

const ContextContainer = euiStyled.div`
  position: relative;
  border-radius: ${({ theme }) => theme.eui.euiBorderRadiusSmall};
`;

const LINE_HEIGHT = 18;
const LineHighlight = euiStyled.div<{ lineNumber: number }>`
  position: absolute;
  width: 100%;
  height: ${LINE_HEIGHT}px;
  top: ${(props) => props.lineNumber * LINE_HEIGHT}px;
  pointer-events: none;
  background-color: ${({ theme }) => tint(0.9, theme.eui.euiColorWarning)};
`;

const LineNumberContainer = euiStyled.div<{ isLibraryFrame: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  border-radius: ${({ theme }) => theme.eui.euiBorderRadiusSmall};
  background: ${({ isLibraryFrame, theme }) =>
    isLibraryFrame
      ? theme.eui.euiColorEmptyShade
      : theme.eui.euiColorLightestShade};
`;

const LineNumber = euiStyled.div<{ highlight: boolean }>`
  position: relative;
  min-width: 42px;
  padding-left: ${({ theme }) => theme.eui.paddingSizes.s};
  padding-right: ${({ theme }) => theme.eui.paddingSizes.xs};
  color: ${({ theme }) => theme.eui.euiColorMediumShade};
  line-height: ${LINE_HEIGHT}px;
  text-align: right;
  border-right: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  background-color: ${({ highlight, theme }) =>
    highlight ? tint(0.9, theme.eui.euiColorWarning) : null};

  &:last-of-type {
    border-radius: 0 0 0 ${({ theme }) => theme.eui.euiBorderRadiusSmall};
  }
`;

const LineContainer = euiStyled.div`
  overflow: auto;
  margin: 0 0 0 42px;
  padding: 0;
  background-color: ${({ theme }) => theme.eui.euiColorEmptyShade};

  &:last-of-type {
    border-radius: 0 0 ${({ theme }) => theme.eui.euiBorderRadiusSmall} 0;
  }
`;

const Line = euiStyled.pre`
  // Override all styles
  margin: 0;
  color: inherit;
  background: inherit;
  border: 0;
  border-radius: 0;
  overflow: initial;
  padding: 0 ${LINE_HEIGHT}px;
  line-height: ${LINE_HEIGHT}px;
`;

const Code = euiStyled.code`
  position: relative;
  padding: 0;
  margin: 0;
  white-space: pre;
  z-index: 2;
`;

function getStackframeLines(stackframe: StackframeWithLineContext) {
  const line = stackframe.line.context;
  const preLines = stackframe.context?.pre || [];
  const postLines = stackframe.context?.post || [];
  return [...preLines, line, ...postLines].map(
    (x) => (x.endsWith('\n') ? x.slice(0, -1) : x) || ' '
  );
}

function getStartLineNumber(stackframe: StackframeWithLineContext) {
  const preLines = size(stackframe.context?.pre || []);
  return stackframe.line.number - preLines;
}

interface Props {
  stackframe: StackframeWithLineContext;
  codeLanguage?: string;
  isLibraryFrame: boolean;
}

export function Context({ stackframe, codeLanguage, isLibraryFrame }: Props) {
  const lines = getStackframeLines(stackframe);
  const startLineNumber = getStartLineNumber(stackframe);
  const highlightedLineIndex = size(stackframe.context?.pre || []);
  const language = codeLanguage || 'javascript'; // TODO: Add support for more languages

  return (
    <ContextContainer>
      <LineHighlight lineNumber={highlightedLineIndex} />
      <LineNumberContainer isLibraryFrame={isLibraryFrame}>
        {lines.map((line, i) => (
          <LineNumber key={line + i} highlight={highlightedLineIndex === i}>
            {i + startLineNumber}.
          </LineNumber>
        ))}
      </LineNumberContainer>
      <LineContainer>
        {lines.map((line, i) => (
          <SyntaxHighlighter
            key={line + i}
            language={language}
            style={xcode}
            PreTag={Line}
            CodeTag={Code}
            customStyle={{ padding: null, overflowX: null }}
          >
            {line}
          </SyntaxHighlighter>
        ))}
      </LineContainer>
    </ContextContainer>
  );
}
