/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';

import type { Pagination, EuiBasicTableProps } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';

import {
  EuiBasicTable,
  EuiLoadingContent,
  EuiSpacer,
  EuiText,
  EuiEmptyPrompt,
  EuiButton,
} from '@elastic/eui';
import { useFilesContext } from '@kbn/shared-ux-file-context';

import * as i18n from './translations';
import { useFilesTableColumns } from './use_files_table_columns';
import { FilePreviewModal } from './file_preview_modal';

const EmptyFilesTable = () => (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_FILES}</h3>}
    data-test-subj="cases-files-table-empty"
    titleSize="xs"
    actions={
      <EuiButton size="s" iconType="plusInCircle" data-test-subj="case-files-table-upload-file">
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

  const columns = useFilesTableColumns({ showModal, getDownloadHref: filesClient.getDownloadHref });

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
    <EuiLoadingContent data-test-subj="cases-files-table-loading" lines={10} />
  ) : (
    <>
      {pagination.totalItemCount > 0 && (
        <>
          <EuiSpacer size="xl" />
          <EuiText size="xs" data-test-subj="cases-files-table-results-count">
            {i18n.RESULTS_COUNT} {resultsCount}
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.FILES_TABLE}
        items={items}
        columns={columns}
        pagination={pagination}
        onChange={onChange}
        data-test-subj="cases-files-table"
        noItemsMessage={<EmptyFilesTable />}
      />
      {isModalVisible && selectedFile !== undefined && (
        <FilePreviewModal
          closeModal={closeModal}
          getDownloadHref={filesClient.getDownloadHref}
          selectedFile={selectedFile}
        />
      )}
    </>
  );
};

FilesTable.displayName = 'FilesTable';
