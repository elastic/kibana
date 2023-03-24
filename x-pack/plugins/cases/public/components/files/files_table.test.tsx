/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';

import { basicFileMock } from '../../containers/mock';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { FilesTable } from './files_table';
import userEvent from '@testing-library/user-event';

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
    appMockRender.render(<FilesTable {...defaultProps} />);

    expect(await screen.findByTestId('cases-files-table-results-count')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-table-filename')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-table-filetype')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-table-date-added')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-table-action-download')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-table-action-delete')).toBeInTheDocument();
  });

  it('renders loading state', async () => {
    appMockRender.render(<FilesTable {...defaultProps} isLoading={true} />);

    expect(await screen.findByTestId('cases-files-table-loading')).toBeInTheDocument();
  });

  it('renders empty table', async () => {
    appMockRender.render(<FilesTable {...defaultProps} items={[]} />);

    expect(await screen.findByTestId('cases-files-table-empty')).toBeInTheDocument();
  });

  it('renders single result count properly', async () => {
    const mockPagination = { pageIndex: 0, pageSize: 10, totalItemCount: 4 };
    appMockRender.render(<FilesTable {...defaultProps} pagination={mockPagination} />);

    expect(await screen.findByTestId('cases-files-table-results-count')).toHaveTextContent(
      'Showing 4 files'
    );
  });

  it('non image rows dont open file preview', async () => {
    const nonImageFileMock = { ...basicFileMock, mimeType: 'something/else' };

    appMockRender.render(<FilesTable {...defaultProps} items={[nonImageFileMock]} />);

    userEvent.click(
      await within(await screen.findByTestId('cases-files-table-filename')).findByTitle(
        'No preview available'
      )
    );

    expect(await screen.queryByTestId('case-files-image-preview')).not.toBeInTheDocument();
  });

  it('image rows open file preview', async () => {
    appMockRender.render(<FilesTable {...defaultProps} />);

    userEvent.click(
      await screen.findByRole('button', {
        name: `${basicFileMock.name}.${basicFileMock.extension}`,
      })
    );
    expect(await screen.findByTestId('case-files-image-preview')).toBeInTheDocument();
  });
});
