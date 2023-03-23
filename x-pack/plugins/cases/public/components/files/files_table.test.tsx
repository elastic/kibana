/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { basicFileMock } from '../../containers/mock';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, TestProviders } from '../../common/mock';
import { FilesTable } from './files_table';

const defaultProps = {
  caseId: 'foobar',
  items: [basicFileMock],
  pagination: { pageIndex: 0, pageSize: 10, totalItemCount: 1 },
  onChange: jest.fn(),
  isLoading: false,
};

describe('FilesTable', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(
      <TestProviders>
        <FilesTable {...defaultProps} />
      </TestProviders>
    );

    expect(await screen.findByTestId('cases-files-table-results-count')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-table-filename')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-table-filetype')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-table-date-added')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-table-action-download')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-table-action-delete')).toBeInTheDocument();
  });

  it('renders loading state', async () => {
    appMockRender.render(
      <TestProviders>
        <FilesTable {...defaultProps} isLoading={true} />
      </TestProviders>
    );

    expect(await screen.findByTestId('cases-files-table-loading')).toBeInTheDocument();
  });

  it('renders empty table', async () => {
    appMockRender.render(
      <TestProviders>
        <FilesTable {...defaultProps} items={[]} />
      </TestProviders>
    );

    expect(await screen.findByTestId('cases-files-table-empty')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-table-empty')).toBeInTheDocument();
  });
});
