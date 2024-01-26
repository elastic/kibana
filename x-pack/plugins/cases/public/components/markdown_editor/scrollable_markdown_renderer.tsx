/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import { MarkdownRenderer } from './renderer';

export const ContentWrapper = styled.div`
  padding: ${({ theme }) => `${theme.eui.euiSizeM} ${theme.eui.euiSizeL}`};
  text-overflow: ellipsis;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
`;

const ScrollableMarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <ContentWrapper className={'eui-xScroll'} data-test-subj="scrollable-markdown">
      <MarkdownRenderer>{content}</MarkdownRenderer>
    </ContentWrapper>
  );
};

ScrollableMarkdownRenderer.displayName = 'ScrollableMarkdownRenderer';

export const ScrollableMarkdown = React.memo(ScrollableMarkdownRenderer);
