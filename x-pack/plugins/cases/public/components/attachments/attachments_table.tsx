/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import {
  EuiLink,
  EuiBasicTable,
  EuiBasicTableColumn,
  Pagination,
  EuiBasicTableProps,
  EuiLoadingContent,
  EuiSpacer,
  EuiText,
  EuiEmptyPrompt,
  EuiButton,
} from '@elastic/eui';
import type { Attachment, Attachments } from '../../../common/ui/types';

interface AttachmentsTableProps {
  isLoading: boolean;
  items: Attachments;
  onChange: EuiBasicTableProps<Attachment>['onChange'];
  onDownload: () => void;
  onDelete: () => void;
  pagination: Pagination;
}

export const AttachmentsTable = ({
  items,
  pagination,
  onChange,
  onDelete,
  onDownload,
  isLoading,
}: AttachmentsTableProps) => {
  const columns: Array<EuiBasicTableColumn<Attachment>> = [
    {
      field: 'fileName',
      name: 'Name',
      'data-test-subj': 'attachments-table-filename',
      render: (fileName: Attachment['fileName']) => (
        <EuiLink color="primary" href="#" target="_blank" external={false}>
          {fileName}
        </EuiLink>
      ),
      width: '60%',
    },
    {
      field: 'fileType',
      'data-test-subj': 'attachments-table-filetype',
      name: 'Type',
    },
    {
      field: 'dateAdded',
      name: 'Date Added',
      'data-test-subj': 'attachments-table-date-added',
      dataType: 'date',
    },
    {
      name: 'Actions',
      width: '120px',
      actions: [
        {
          name: 'Download',
          isPrimary: true,
          description: 'Download this file',
          icon: 'download',
          type: 'icon',
          onClick: onDownload,
          'data-test-subj': 'attachments-table-action-download',
        },
        {
          name: 'Delete',
          isPrimary: true,
          description: 'Delete this file',
          color: 'danger',
          icon: 'trash',
          type: 'icon',
          onClick: onDelete,
          'data-test-subj': 'attachments-table-action-delete',
        },
      ],
    },
  ];

  const resultsCount = useMemo(
    () => (
      <>
        <strong>
          {pagination.pageSize * pagination.pageIndex + 1}-
          {pagination.pageSize * pagination.pageIndex + pagination.pageSize}
        </strong>{' '}
        of <strong>{pagination.totalItemCount}</strong>
      </>
    ),
    [pagination.pageIndex, pagination.pageSize, pagination.totalItemCount]
  );

  return isLoading ? (
    <EuiLoadingContent data-test-subj="attachments-table-loading" lines={10} />
  ) : (
    <>
      {pagination.totalItemCount > 0 && (
        <>
          <EuiSpacer size="xl" />
          <EuiText size="xs" data-test-subj="attachments-table-results-count">
            Showing {resultsCount}
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption="Attachments Table"
        items={items}
        columns={columns}
        pagination={pagination}
        onChange={onChange}
        data-test-subj="attachments-table"
        noItemsMessage={
          <EuiEmptyPrompt
            title={<h3>No attachments available</h3>}
            data-test-subj="attachments-table-empty"
            titleSize="xs"
            actions={
              <EuiButton
                size="s"
                iconType="plusInCircle"
                data-test-subj="case-detail-attachments-table-upload-file"
              >
                Upload File
              </EuiButton>
            }
          />
        }
      />
    </>
  );
};
