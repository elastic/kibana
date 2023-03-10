/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { basicAttachment } from '../../containers/mock';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { FilesTable } from './files_table';

const onDownload = jest.fn();
const onDelete = jest.fn();

const defaultProps = {
  items: [basicAttachment],
  pagination: { pageIndex: 0, pageSize: 10, totalItemCount: 1 },
  onChange: jest.fn(),
  onDelete,
  onDownload,
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

    expect(await screen.findByTestId('files-table-results-count')).toBeInTheDocument();
    expect(await screen.findByTestId('files-table-filename')).toBeInTheDocument();
    expect(await screen.findByTestId('files-table-filetype')).toBeInTheDocument();
    expect(await screen.findByTestId('files-table-date-added')).toBeInTheDocument();
    expect(await screen.findByTestId('files-table-action-download')).toBeInTheDocument();
    expect(await screen.findByTestId('files-table-action-delete')).toBeInTheDocument();
  });

  it('renders loading state', async () => {
    appMockRender.render(<FilesTable {...defaultProps} isLoading={true} />);

    expect(await screen.findByTestId('files-table-loading')).toBeInTheDocument();
  });

  it('renders empty table', async () => {
    appMockRender.render(<FilesTable {...defaultProps} items={[]} />);

    expect(await screen.findByTestId('files-table-empty')).toBeInTheDocument();
  });

  it('calls delete action', async () => {
    appMockRender.render(<FilesTable {...defaultProps} />);
    userEvent.click(await screen.findByTestId('files-table-action-delete'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('calls download action', async () => {
    appMockRender.render(<FilesTable {...defaultProps} />);
    userEvent.click(await screen.findByTestId('files-table-action-delete'));
    expect(onDelete).toHaveBeenCalled();
  });
});
