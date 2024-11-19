/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';

import type { Pagination, EuiBasicTableProps } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';

import { EuiBasicTable, EuiSkeletonText, EuiSpacer, EuiText, EuiEmptyPrompt } from '@elastic/eui';

import * as i18n from './translations';
import { useFilesTableColumns } from './use_files_table_columns';
import { FilePreview } from './file_preview';
import { AddFile } from './add_file';
import { useFilePreview } from './use_file_preview';

const EmptyFilesTable = ({ caseId }: { caseId: string }) => (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_FILES}</h3>}
    data-test-subj="cases-files-table-empty"
    titleSize="xs"
    actions={<AddFile caseId={caseId} />}
  />
);

EmptyFilesTable.displayName = 'EmptyFilesTable';

interface FilesTableProps {
  caseId: string;
  isLoading: boolean;
  items: FileJSON[];
  onChange: EuiBasicTableProps<FileJSON>['onChange'];
  pagination: Pagination;
}

export const FilesTable = ({ caseId, items, pagination, onChange, isLoading }: FilesTableProps) => {
  const { isPreviewVisible, showPreview, closePreview } = useFilePreview();

  const [selectedFile, setSelectedFile] = useState<FileJSON>();

  const displayPreview = (file: FileJSON) => {
    setSelectedFile(file);
    showPreview();
  };

  const filesTableRowProps = useCallback(
    (file: FileJSON) => ({
      'data-test-subj': `cases-files-table-row-${file.id}`,
    }),
    []
  );

  const columns = useFilesTableColumns({ caseId, showPreview: displayPreview });

  return isLoading ? (
    <>
      <EuiSpacer size="l" />
      <EuiSkeletonText data-test-subj="cases-files-table-loading" lines={10} />
    </>
  ) : (
    <>
      {pagination.totalItemCount > 0 && (
        <>
          <EuiSpacer size="xl" />
          <EuiText size="xs" color="subdued" data-test-subj="cases-files-table-results-count">
            {i18n.SHOWING_FILES(items.length)}
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.FILES_TABLE}
        items={items}
        rowHeader="name"
        columns={columns}
        pagination={pagination}
        onChange={onChange}
        data-test-subj="cases-files-table"
        noItemsMessage={<EmptyFilesTable caseId={caseId} />}
        rowProps={filesTableRowProps}
      />
      {isPreviewVisible && selectedFile !== undefined && (
        <FilePreview closePreview={closePreview} selectedFile={selectedFile} />
      )}
    </>
  );
};

FilesTable.displayName = 'FilesTable';
