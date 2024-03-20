/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';

import { MarkdownRenderer } from './renderer';

export const getContentWrapperCss = (euiTheme: EuiThemeComputed<{}>) => css`
  padding: ${`${euiTheme.size.m} ${euiTheme.size.l}`};
  text-overflow: ellipsis;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
`;

const ScrollableMarkdownRenderer = ({ content }: { content: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      className={'eui-xScroll'}
      css={getContentWrapperCss(euiTheme)}
      data-test-subj="scrollable-markdown"
    >
      <MarkdownRenderer>{content}</MarkdownRenderer>
    </div>
  );
};

ScrollableMarkdownRenderer.displayName = 'ScrollableMarkdownRenderer';

export const ScrollableMarkdown = React.memo(ScrollableMarkdownRenderer);
