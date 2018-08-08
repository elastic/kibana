/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/light';
import { xcode } from 'react-syntax-highlighter/dist/styles';
import { get, size } from 'lodash';

import {
  unit,
  units,
  px,
  colors,
  borderRadius
} from '../../../style/variables';

const ContextContainer = styled.div`
  position: relative;
  border-radius: 0 0 ${borderRadius} ${borderRadius};
`;

const LINE_HEIGHT = units.eighth * 9;
const LineHighlight = styled.div`
  position: absolute;
  width: 100%;
  height: ${px(units.eighth * 9)};
  top: ${props => px(props.lineNumber * LINE_HEIGHT)};
  pointer-events: none;
  background-color: ${colors.yellow};
`;

const LineNumberContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 0 0 0 ${borderRadius};
  background: ${props => (props.isLibraryFrame ? colors.white : colors.gray5)};
`;

const LineNumber = styled.div`
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

const getStackframeLines = stackframe => {
  const preContext = get(stackframe, 'context.pre', []);
  const postContext = get(stackframe, 'context.post', []);
  return [...preContext, stackframe.line.context, ...postContext];
};

const getStartLineNumber = stackframe => {
  const preLines = size(get(stackframe, 'context.pre', []));
  return stackframe.line.number - preLines;
};

export function Context({ stackframe, codeLanguage, isLibraryFrame }) {
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
