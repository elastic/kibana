/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
} from '@elastic/eui';

import { ListSchema, exportList, useFindLists, useDeleteList } from '../../../lists_plugin_deps';
import { useToasts, useKibana } from '../../../common/lib/kibana';
import { GenericDownloader } from '../../../common/components/generic_downloader';
import * as i18n from './translations';
import { ValueListsTable } from './table';
import { ValueListsForm } from './form';

interface ValueListsModalProps {
  onClose: () => void;
  showModal: boolean;
}

export const ValueListsModalComponent: React.FC<ValueListsModalProps> = ({
  onClose,
  showModal,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const { http } = useKibana().services;
  const { start: findLists, ...lists } = useFindLists();
  const { start: deleteList } = useDeleteList();
  const [exportListId, setExportListId] = useState<string>();
  const toasts = useToasts();

  const fetchLists = useCallback(() => {
    findLists({ http, pageIndex: pageIndex + 1, pageSize });
  }, [http, findLists, pageIndex, pageSize]);

  const handleDelete = useCallback(
    async ({ id }: { id: string }) => {
      await deleteList({ http, id });
      fetchLists();
    },
    [deleteList, http, fetchLists]
  );

  const handleExport = useCallback(
    async ({ ids }: { ids: string[] }) =>
      exportList({ http, listId: ids[0], signal: new AbortController().signal }),
    [http]
  );
  const handleExportClick = useCallback(({ id }: { id: string }) => setExportListId(id), []);
  const handleExportComplete = useCallback(() => setExportListId(undefined), []);

  const handleTableChange = useCallback(
    ({ page: { index, size } }: { page: { index: number; size: number } }) => {
      setPageIndex(index);
      setPageSize(size);
    },
    [setPageIndex, setPageSize]
  );
  const handleUploadError = useCallback(
    (error: unknown) => {
      if (!String(error).includes('AbortError')) {
        const reportedError = error instanceof Error ? error : new Error(String(error));
        toasts.addError(reportedError, { title: i18n.UPLOAD_ERROR });
      }
    },
    [toasts]
  );
  const handleUploadSuccess = useCallback(
    (response: ListSchema) => {
      toasts.addSuccess({
        text: i18n.uploadSuccessMessage(response.name),
        title: i18n.UPLOAD_SUCCESS,
      });
      fetchLists();
    },
    [fetchLists, toasts]
  );

  useEffect(() => {
    if (showModal) {
      fetchLists();
    }
  }, [showModal, fetchLists]);

  if (!showModal) {
    return null;
  }

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: lists.result?.total ?? 0,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  return (
    <EuiOverlayMask>
      <EuiModal onClose={onClose} maxWidth={750}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <ValueListsForm onSuccess={handleUploadSuccess} onError={handleUploadError} />
          <EuiSpacer />
          <ValueListsTable
            lists={lists.result?.data ?? []}
            loading={lists.loading}
            onDelete={handleDelete}
            onExport={handleExportClick}
            onChange={handleTableChange}
            pagination={pagination}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButton onClick={onClose}>{i18n.CLOSE_BUTTON}</EuiButton>
        </EuiModalFooter>
      </EuiModal>
      <GenericDownloader
        filename={exportListId ?? 'download.txt'}
        ids={exportListId != null ? [exportListId] : undefined}
        onExportSuccess={handleExportComplete}
        onExportFailure={handleExportComplete}
        exportSelectedData={handleExport}
      />
    </EuiOverlayMask>
  );
};

ValueListsModalComponent.displayName = 'ValueListsModalComponent';

export const ValueListsModal = React.memo(ValueListsModalComponent);

ValueListsModal.displayName = 'ValueListsModal';
