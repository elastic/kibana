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

import {
  ListSchema,
  exportList,
  useFindLists,
  useDeleteList,
  useCursor,
} from '../../../shared_imports';
import { useKibana } from '../../../common/lib/kibana';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
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
  const [pageSize, setPageSize] = useState(5);
  const [cursor, setCursor] = useCursor({ pageIndex, pageSize });
  const { http } = useKibana().services;
  const { start: findLists, ...lists } = useFindLists();
  const { start: deleteList, result: deleteResult } = useDeleteList();
  const [exportListId, setExportListId] = useState<string>();
  const { addError, addSuccess } = useAppToasts();

  const fetchLists = useCallback(() => {
    findLists({ cursor, http, pageIndex: pageIndex + 1, pageSize });
  }, [cursor, http, findLists, pageIndex, pageSize]);

  const handleDelete = useCallback(
    ({ id }: { id: string }) => {
      deleteList({ http, id });
    },
    [deleteList, http]
  );

  useEffect(() => {
    if (deleteResult != null) {
      fetchLists();
    }
  }, [deleteResult, fetchLists]);

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
    (error: Error) => {
      if (error.name !== 'AbortError') {
        addError(error, { title: i18n.UPLOAD_ERROR });
      }
    },
    [addError]
  );
  const handleUploadSuccess = useCallback(
    (response: ListSchema) => {
      addSuccess({
        text: i18n.uploadSuccessMessage(response.name),
        title: i18n.UPLOAD_SUCCESS_TITLE,
      });
      fetchLists();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addSuccess]
  );

  useEffect(() => {
    if (showModal) {
      fetchLists();
    }
  }, [showModal, fetchLists]);

  useEffect(() => {
    if (!lists.loading && lists.result?.cursor) {
      setCursor(lists.result.cursor);
    }
  }, [lists.loading, lists.result, setCursor]);

  if (!showModal) {
    return null;
  }

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: lists.result?.total ?? 0,
    hidePerPageOptions: true,
  };

  return (
    <EuiOverlayMask onClick={onClose}>
      <EuiModal onClose={onClose} maxWidth={800}>
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
          <EuiButton data-test-subj="value-lists-modal-close-action" onClick={onClose}>
            {i18n.CLOSE_BUTTON}
          </EuiButton>
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
