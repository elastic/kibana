/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, size } from 'lodash';
import React from 'react';
// TODO add dependency for @types/react-syntax-highlighter
// @ts-ignore
import javascript from 'react-syntax-highlighter/dist/languages/javascript';
// @ts-ignore
import python from 'react-syntax-highlighter/dist/languages/python';
// @ts-ignore
import ruby from 'react-syntax-highlighter/dist/languages/ruby';
// @ts-ignore
import SyntaxHighlighter from 'react-syntax-highlighter/dist/light';
// @ts-ignore
import { registerLanguage } from 'react-syntax-highlighter/dist/light';
// @ts-ignore
import { xcode } from 'react-syntax-highlighter/dist/styles';

registerLanguage('javascript', javascript);
registerLanguage('python', python);
registerLanguage('ruby', ruby);

import styled from 'styled-components';

import { IStackframeWithLineContext } from 'x-pack/plugins/apm/typings/es_schemas/Stackframe';
import {
  borderRadius,
  colors,
  px,
  unit,
  units
} from '../../../style/variables';

const ContextContainer = styled.div`
  position: relative;
  border-radius: 0 0 ${borderRadius} ${borderRadius};
`;

const LINE_HEIGHT = units.eighth * 9;
const LineHighlight = styled.div<{ lineNumber: number }>`
  position: absolute;
  width: 100%;
  height: ${px(units.eighth * 9)};
  top: ${props => px(props.lineNumber * LINE_HEIGHT)};
  pointer-events: none;
  background-color: ${colors.yellow};
`;

const LineNumberContainer = styled.div<{ isLibraryFrame: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 0 0 0 ${borderRadius};
  background: ${props => (props.isLibraryFrame ? colors.white : colors.gray5)};
`;

const LineNumber = styled.div<{ highlight: boolean }>`
  position: relative;
  min-width: ${px(units.eighth * 21)};
  padding-left: ${px(units.half)};
  padding-right: ${px(units.quarter)};
  color: ${colors.gray3};
  line-height: ${px(unit + units.eighth)};
  text-align: right;
  border-right: 1px solid ${colors.gray4};
  background-color: ${props => (props.highlight ? colors.yellow : null)};

  &:last-of-type {
    border-radius: 0 0 0 ${borderRadius};
  }
`;

const LineContainer = styled.div`
  overflow: auto;
  margin: 0 0 0 ${px(units.eighth * 21)};
  padding: 0;
  background-color: ${colors.white};

  &:last-of-type {
    border-radius: 0 0 ${borderRadius} 0;
  }
`;

const Line = styled.pre`
  // Override all styles
  margin: 0;
  color: inherit;
  background: inherit;
  border: 0;
  border-radius: 0;
  overflow: initial;
  padding: 0 ${px(LINE_HEIGHT)};
  line-height: ${px(LINE_HEIGHT)};
`;

const Code = styled.code`
  position: relative;
  padding: 0;
  margin: 0;
  white-space: pre;
  z-index: 2;
`;

function getStackframeLines(stackframe: IStackframeWithLineContext) {
  const line = stackframe.line.context;
  const preLines: string[] = get(stackframe, 'context.pre', []);
  const postLines: string[] = get(stackframe, 'context.post', []);
  return [...preLines, line, ...postLines];
}

function getStartLineNumber(stackframe: IStackframeWithLineContext) {
  const preLines = size(get(stackframe, 'context.pre', []));
  return stackframe.line.number - preLines;
}

interface Props {
  stackframe: IStackframeWithLineContext;
  codeLanguage?: string;
  isLibraryFrame: boolean;
}

export function Context({ stackframe, codeLanguage, isLibraryFrame }: Props) {
  const lines = getStackframeLines(stackframe);
  const startLineNumber = getStartLineNumber(stackframe);
  const highlightedLineIndex = size(get(stackframe, 'context.pre', []));
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
            {line || '\n'}
          </SyntaxHighlighter>
        ))}
      </LineContainer>
    </ContextContainer>
  );
}
