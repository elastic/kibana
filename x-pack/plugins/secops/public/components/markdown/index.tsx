/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTableRow, EuiTableRowCell, EuiText } from '@elastic/eui';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { pure } from 'recompose';
import styled from 'styled-components';

const TableHeader = styled.thead`
  font-weight: bold;
`;

const markdownRenderers = {
  root: ({ children }: { children: React.ReactNode[] }) => (
    <EuiText data-test-subj="markdown-root" grow={false}>
      {...children}
    </EuiText>
  ),
  table: ({ children }: { children: React.ReactNode[] }) => (
    <table data-test-subj="markdown-table" className="euiTable euiTable--responsive">
      {...children}
    </table>
  ),
  tableHead: ({ children }: { children: React.ReactNode[] }) => (
    <TableHeader data-test-subj="markdown-table-header">{...children}</TableHeader>
  ),
  tableRow: ({ children }: { children: React.ReactNode[] }) => (
    <EuiTableRow data-test-subj="markdown-table-row">{...children}</EuiTableRow>
  ),
  tableCell: ({ children }: { children: React.ReactNode[] }) => (
    <EuiTableRowCell data-test-subj="markdown-table-cell">{...children}</EuiTableRowCell>
  ),
};

export const Markdown = pure<{ raw?: string }>(({ raw }) => (
  <ReactMarkdown
    data-test-subj="markdown"
    linkTarget="_blank"
    renderers={markdownRenderers}
    source={raw}
  />
));
