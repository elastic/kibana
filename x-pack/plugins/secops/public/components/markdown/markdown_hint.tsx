/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

const Bold = styled.span`
  font-weight: bold;
  margin-right: 5px;
`;

const MarkdownHintContainer = styled(EuiText)<{ visibility: string }>`
  visibility: ${({ visibility }) => visibility};
`;

const ImageUrl = styled.span`
  margin-left: 5px;
`;

const Italic = styled.span`
  font-style: italic;
  margin-right: 5px;
`;

const Strikethrough = styled.span`
  text-decoration: line-through;
`;

const Code = styled.span`
  font-family: monospace;
  margin-right: 5px;
`;

const TrailingWhitespace = styled.span`
  margin-right: 5px;
`;

export const MarkdownHint = pure<{ show: boolean }>(({ show }) => (
  <MarkdownHintContainer
    color="subdued"
    data-test-subj="markdown-hint"
    size="xs"
    visibility={show ? 'inline' : 'hidden'}
  >
    <Bold data-test-subj="bold-hint">**bold**</Bold>
    <Italic data-test-subj="italic-hint">_italics_</Italic>
    <Code data-test-subj="code-hint">`code`</Code>
    <TrailingWhitespace>{'[link](url)'}</TrailingWhitespace>
    <TrailingWhitespace>* bullet</TrailingWhitespace>
    <Code data-test-subj="preformatted-hint">```preformatted```</Code>
    <TrailingWhitespace>{'>quote'}</TrailingWhitespace>
    ~~<Strikethrough data-test-subj="strikethrough-hint">strikethrough</Strikethrough>~~
    <ImageUrl>{'![image](url)'}</ImageUrl>
  </MarkdownHintContainer>
));
