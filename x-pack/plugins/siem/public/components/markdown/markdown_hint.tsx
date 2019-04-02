/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import * as i18n from './translations';

const Heading = styled.span`
  margin-right: 5px;
`;

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
    <Heading data-test-subj="heading-hint">{i18n.MARKDOWN_HINT_HEADING}</Heading>
    <Bold data-test-subj="bold-hint">{i18n.MARKDOWN_HINT_BOLD}</Bold>
    <Italic data-test-subj="italic-hint">{i18n.MARKDOWN_HINT_ITALICS}</Italic>
    <Code data-test-subj="code-hint">{i18n.MARKDOWN_HINT_CODE}</Code>
    <TrailingWhitespace>{i18n.MARKDOWN_HINT_URL}</TrailingWhitespace>
    <TrailingWhitespace>{i18n.MARKDOWN_HINT_BULLET}</TrailingWhitespace>
    <Code data-test-subj="preformatted-hint">{i18n.MARKDOWN_HINT_PREFORMATTED}</Code>
    <TrailingWhitespace>{i18n.MARKDOWN_HINT_QUOTE}</TrailingWhitespace>
    ~~
    <Strikethrough data-test-subj="strikethrough-hint">
      {i18n.MARKDOWN_HINT_STRIKETHROUGH}
    </Strikethrough>
    ~~
    <ImageUrl>{i18n.MARKDOWN_HINT_IMAGE_URL}</ImageUrl>
  </MarkdownHintContainer>
));
