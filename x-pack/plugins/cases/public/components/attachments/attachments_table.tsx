/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';

import type { EuiBasicTableColumn, Pagination, EuiBasicTableProps } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';

import {
  EuiModalBody,
  EuiModalFooter,
  EuiButtonIcon,
  EuiLink,
  EuiBasicTable,
  EuiLoadingContent,
  EuiSpacer,
  EuiText,
  EuiEmptyPrompt,
  EuiButton,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import { FileImage } from '@kbn/shared-ux-file-image';

import { APP_ID } from '../../../common';
import { CASES_FILE_KINDS } from '../../files';

interface AttachmentsTableProps {
  isLoading: boolean;
  items: FileJSON[];
  onChange: EuiBasicTableProps<FileJSON>['onChange'];
  pagination: Pagination;
}

export const AttachmentsTable = ({
  items,
  pagination,
  onChange,
  isLoading,
}: AttachmentsTableProps) => {
  const { client: filesClient } = useFilesContext();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileJSON>();

  const closeModal = () => setIsModalVisible(false);
  const showModal = (file: FileJSON) => {
    setSelectedFile(file);
    setIsModalVisible(true);
  };

  const columns: Array<EuiBasicTableColumn<FileJSON>> = [
    {
      name: 'Name',
      'data-test-subj': 'attachments-table-filename',
      render: (attachment: FileJSON) => (
        <EuiLink onClick={() => showModal(attachment)}>{attachment.name}</EuiLink>
      ),
      width: '60%',
    },
    {
      field: 'mimeType',
      'data-test-subj': 'attachments-table-filetype',
      name: 'Type',
    },
    {
      field: 'created',
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
          render: (attachment: FileJSON) => {
            return (
              <EuiButtonIcon
                iconType={'download'}
                aria-label={'download'}
                href={filesClient.getDownloadHref({
                  fileKind: CASES_FILE_KINDS[APP_ID].id,
                  id: attachment.id,
                })}
              />
            );
          },
          'data-test-subj': 'attachments-table-action-download',
        },
        {
          name: 'Delete',
          isPrimary: true,
          description: 'Delete this file',
          color: 'danger',
          icon: 'trash',
          type: 'icon',
          onClick: () => {},
          'data-test-subj': 'attachments-table-action-delete',
        },
      ],
    },
  ];

  const resultsCount = useMemo(
    () => (
      <>
        <strong>
          {pagination.pageSize * pagination.pageIndex + 1}
          {'-'}
          {pagination.pageSize * pagination.pageIndex + pagination.pageSize}
        </strong>{' '}
        {'of'} <strong>{pagination.totalItemCount}</strong>
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
            {'Showing'} {resultsCount}
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
            title={<h3>{'No attachments available'}</h3>}
            data-test-subj="attachments-table-empty"
            titleSize="xs"
            actions={
              <EuiButton
                size="s"
                iconType="plusInCircle"
                data-test-subj="case-detail-attachments-table-upload-file"
              >
                {'Add File'}
              </EuiButton>
            }
          />
        }
      />
      {isModalVisible && (
        <EuiModal onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{selectedFile?.name}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <FileImage
              size="l"
              alt=""
              src={filesClient.getDownloadHref({
                id: selectedFile?.id || '',
                fileKind: CASES_FILE_KINDS[APP_ID].id,
              })}
            />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton size="s" onClick={closeModal} fill>
              {'Close'}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

AttachmentsTable.displayName = 'AttachmentsTable';
