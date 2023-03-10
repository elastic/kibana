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

import * as i18n from './translations';
import { APP_ID } from '../../../common';
import { CASES_FILE_KINDS } from '../../files';

const EmptyFilesTable = () => (
  <EuiEmptyPrompt
    title={<h3>{'No attachments available'}</h3>}
    data-test-subj="files-table-empty"
    titleSize="xs"
    actions={
      <EuiButton
        size="s"
        iconType="plusInCircle"
        data-test-subj="case-detail-files-table-upload-file"
      >
        {i18n.ADD_FILE}
      </EuiButton>
    }
  />
);

EmptyFilesTable.displayName = 'EmptyFilesTable';

interface FilesTableProps {
  isLoading: boolean;
  items: FileJSON[];
  onChange: EuiBasicTableProps<FileJSON>['onChange'];
  pagination: Pagination;
}

export const FilesTable = ({ items, pagination, onChange, isLoading }: FilesTableProps) => {
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
      name: i18n.NAME,
      'data-test-subj': 'files-table-filename',
      render: (attachment: FileJSON) => (
        <EuiLink onClick={() => showModal(attachment)}>{attachment.name}</EuiLink>
      ),
      width: '60%',
    },
    {
      name: i18n.TYPE,
      field: 'mimeType',
      'data-test-subj': 'files-table-filetype',
    },
    {
      name: i18n.DATE_ADDED,
      field: 'created',
      'data-test-subj': 'files-table-date-added',
      dataType: 'date',
    },
    {
      name: i18n.ACTIONS,
      width: '120px',
      actions: [
        {
          name: 'Download',
          isPrimary: true,
          description: i18n.DOWNLOAD_FILE,
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
          'data-test-subj': 'files-table-action-download',
        },
        {
          name: 'Delete',
          isPrimary: true,
          description: i18n.DELETE_FILE,
          color: 'danger',
          icon: 'trash',
          type: 'icon',
          onClick: () => {},
          'data-test-subj': 'files-table-action-delete',
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
    <EuiLoadingContent data-test-subj="files-table-loading" lines={10} />
  ) : (
    <>
      {pagination.totalItemCount > 0 && (
        <>
          <EuiSpacer size="xl" />
          <EuiText size="xs" data-test-subj="files-table-results-count">
            {i18n.RESULTS_COUNT} {resultsCount}
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption="Files Table"
        items={items}
        columns={columns}
        pagination={pagination}
        onChange={onChange}
        data-test-subj="attachments-table"
        noItemsMessage={<EmptyFilesTable />}
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

FilesTable.displayName = 'FilesTable';
