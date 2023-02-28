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
import { AttachmentsTable } from './attachments_table';

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

describe('AttachmentsTable', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(<AttachmentsTable {...defaultProps} />);

    expect(await screen.findByTestId('attachments-table-results-count')).toBeInTheDocument();
    expect(await screen.findByTestId('attachments-table-filename')).toBeInTheDocument();
    expect(await screen.findByTestId('attachments-table-filetype')).toBeInTheDocument();
    expect(await screen.findByTestId('attachments-table-date-added')).toBeInTheDocument();
    expect(await screen.findByTestId('attachments-table-action-download')).toBeInTheDocument();
    expect(await screen.findByTestId('attachments-table-action-delete')).toBeInTheDocument();
  });

  it('renders loading state', async () => {
    appMockRender.render(<AttachmentsTable {...defaultProps} isLoading={true} />);

    expect(await screen.findByTestId('attachments-table-loading')).toBeInTheDocument();
  });

  it('renders empty table', async () => {
    appMockRender.render(<AttachmentsTable {...defaultProps} items={[]} />);

    expect(await screen.findByTestId('attachments-table-empty')).toBeInTheDocument();
  });

  it('calls delete action', async () => {
    appMockRender.render(<AttachmentsTable {...defaultProps} />);
    userEvent.click(await screen.findByTestId('attachments-table-action-delete'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('calls download action', async () => {
    appMockRender.render(<AttachmentsTable {...defaultProps} />);
    userEvent.click(await screen.findByTestId('attachments-table-action-delete'));
    expect(onDelete).toHaveBeenCalled();
  });
});
