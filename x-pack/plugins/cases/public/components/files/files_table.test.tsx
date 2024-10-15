/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';

import { basicFileMock } from '../../containers/mock';
import type { AppMockRenderer } from '../../common/mock';

import { constructFileKindIdByOwner } from '../../../common/files';
import { createAppMockRenderer, mockedTestProvidersOwner } from '../../common/mock';
import { FilesTable } from './files_table';
import userEvent from '@testing-library/user-event';

describe('FilesTable', () => {
  const onTableChange = jest.fn();
  const defaultProps = {
    caseId: 'foobar',
    items: [basicFileMock],
    pagination: { pageIndex: 0, pageSize: 10, totalItemCount: 1 },
    isLoading: false,
    onChange: onTableChange,
  };

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
    expect(
      await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
    ).toBeInTheDocument();
  });

  it('renders loading state', async () => {
    appMockRender.render(<FilesTable {...defaultProps} isLoading={true} />);

    expect(await screen.findByTestId('cases-files-table-loading')).toBeInTheDocument();
  });

  it('renders empty table', async () => {
    appMockRender.render(<FilesTable {...defaultProps} items={[]} />);

    expect(await screen.findByTestId('cases-files-table-empty')).toBeInTheDocument();
  });

  it('FileAdd in empty table is clickable', async () => {
    appMockRender.render(<FilesTable {...defaultProps} items={[]} />);

    expect(await screen.findByTestId('cases-files-table-empty')).toBeInTheDocument();

    const addFileButton = await screen.findByTestId('cases-files-add');

    expect(addFileButton).toBeInTheDocument();

    await userEvent.click(addFileButton);

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();
  });

  it('renders single result count properly', async () => {
    const mockPagination = { pageIndex: 0, pageSize: 10, totalItemCount: 1 };
    appMockRender.render(<FilesTable {...defaultProps} pagination={mockPagination} />);

    expect(await screen.findByTestId('cases-files-table-results-count')).toHaveTextContent(
      `Showing ${defaultProps.items.length} file`
    );
  });

  it('non image rows dont open file preview', async () => {
    const nonImageFileMock = { ...basicFileMock, mimeType: 'something/else' };

    appMockRender.render(<FilesTable {...defaultProps} items={[nonImageFileMock]} />);

    await userEvent.click(
      await within(await screen.findByTestId('cases-files-table-filename')).findByTitle(
        'No preview available'
      )
    );

    expect(screen.queryByTestId('cases-files-image-preview')).not.toBeInTheDocument();
  });

  it('image rows open file preview', async () => {
    appMockRender.render(<FilesTable {...defaultProps} />);

    await userEvent.click(
      await screen.findByRole('button', {
        name: `${basicFileMock.name}.${basicFileMock.extension}`,
      })
    );

    expect(await screen.findByTestId('cases-files-image-preview')).toBeInTheDocument();
  });

  it('different mimeTypes are displayed correctly', async () => {
    const mockPagination = { pageIndex: 0, pageSize: 10, totalItemCount: 7 };
    appMockRender.render(
      <FilesTable
        {...defaultProps}
        pagination={mockPagination}
        items={[
          { ...basicFileMock, mimeType: '' },
          { ...basicFileMock, mimeType: 'no-slash' },
          { ...basicFileMock, mimeType: '/slash-in-the-beginning' },
          { ...basicFileMock, mimeType: undefined },
          { ...basicFileMock, mimeType: 'application/gzip' },
          { ...basicFileMock, mimeType: 'text/csv' },
          { ...basicFileMock, mimeType: 'image/tiff' },
        ]}
      />
    );

    expect((await screen.findAllByText('Unknown')).length).toBe(4);
    expect(await screen.findByText('Compressed')).toBeInTheDocument();
    expect(await screen.findByText('Text')).toBeInTheDocument();
    expect(await screen.findByText('Image')).toBeInTheDocument();
  });

  it('download button renders correctly', async () => {
    appMockRender.render(<FilesTable {...defaultProps} />);

    await userEvent.click(
      await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
    );

    await waitFor(() => {
      expect(appMockRender.getFilesClient().getDownloadHref).toBeCalled();
    });

    await waitFor(() => {
      expect(appMockRender.getFilesClient().getDownloadHref).toHaveBeenCalledWith({
        fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
        id: basicFileMock.id,
      });
    });

    expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();
  });

  it('delete button renders correctly', async () => {
    appMockRender.render(<FilesTable {...defaultProps} />);

    await userEvent.click(
      await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
    );

    expect(await screen.findByTestId('cases-files-delete-button')).toBeInTheDocument();
  });

  it('clicking delete button opens deletion modal', async () => {
    appMockRender.render(<FilesTable {...defaultProps} />);

    await userEvent.click(
      await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
    );

    await userEvent.click(await screen.findByTestId('cases-files-delete-button'));

    expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();
  });

  it('clicking the copy file hash button rerenders the popover correctly', async () => {
    appMockRender.render(<FilesTable {...defaultProps} />);

    const popoverButton = await screen.findByTestId(
      `cases-files-actions-popover-button-${basicFileMock.id}`
    );

    expect(popoverButton).toBeInTheDocument();
    await userEvent.click(popoverButton);

    expect(
      await screen.findByTestId(`cases-files-popover-${basicFileMock.id}`)
    ).toBeInTheDocument();

    const copyFileHashButton = await screen.findByTestId('cases-files-copy-hash-button');

    expect(copyFileHashButton).toBeInTheDocument();

    await userEvent.click(copyFileHashButton);

    expect(await screen.findByTestId('cases-files-copy-md5-hash-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-copy-sha1-hash-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-copy-sha256-hash-button')).toBeInTheDocument();
  });

  it('go to next page calls onTableChange with correct values', async () => {
    const mockPagination = { pageIndex: 0, pageSize: 1, totalItemCount: 2 };

    appMockRender.render(
      <FilesTable
        {...defaultProps}
        pagination={mockPagination}
        items={[{ ...basicFileMock }, { ...basicFileMock }]}
      />
    );

    await userEvent.click(await screen.findByTestId('pagination-button-next'));

    await waitFor(() =>
      expect(onTableChange).toHaveBeenCalledWith({
        page: { index: mockPagination.pageIndex + 1, size: mockPagination.pageSize },
      })
    );
  });

  it('go to previous page calls onTableChange with correct values', async () => {
    const mockPagination = { pageIndex: 1, pageSize: 1, totalItemCount: 2 };

    appMockRender.render(
      <FilesTable
        {...defaultProps}
        pagination={mockPagination}
        items={[{ ...basicFileMock }, { ...basicFileMock }]}
      />
    );

    await userEvent.click(await screen.findByTestId('pagination-button-previous'));

    await waitFor(() =>
      expect(onTableChange).toHaveBeenCalledWith({
        page: { index: mockPagination.pageIndex - 1, size: mockPagination.pageSize },
      })
    );
  });

  it('changing perPage calls onTableChange with correct values', async () => {
    appMockRender.render(
      <FilesTable {...defaultProps} items={[{ ...basicFileMock }, { ...basicFileMock }]} />
    );

    await userEvent.click(await screen.findByTestId('tablePaginationPopoverButton'));

    const pageSizeOption = await screen.findByTestId('tablePagination-50-rows');

    pageSizeOption.style.pointerEvents = 'all';

    await userEvent.click(pageSizeOption);

    await waitFor(() =>
      expect(onTableChange).toHaveBeenCalledWith({
        page: { index: 0, size: 50 },
      })
    );
  });
});
