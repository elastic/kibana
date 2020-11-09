/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiPanel,
  EuiSpacer,
  EuiText,
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
import * as i18n from './translations';
import { buildColumns } from './table_helpers';
import { ValueListsForm } from './form';
import { AutoDownload } from './auto_download';

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
  const [deletingListIds, setDeletingListIds] = useState<string[]>([]);
  const [exportingListIds, setExportingListIds] = useState<string[]>([]);
  const [exportDownload, setExportDownload] = useState<{ name?: string; blob?: Blob }>({});
  const { addError, addSuccess } = useAppToasts();

  const fetchLists = useCallback(() => {
    findLists({ cursor, http, pageIndex: pageIndex + 1, pageSize });
  }, [cursor, http, findLists, pageIndex, pageSize]);

  const handleDelete = useCallback(
    ({ id }: { id: string }) => {
      setDeletingListIds([...deletingListIds, id]);
      deleteList({ http, id });
    },
    [deleteList, deletingListIds, http]
  );

  useEffect(() => {
    if (deleteResult != null) {
      setDeletingListIds((ids) => [...ids.filter((id) => id !== deleteResult.id)]);
      fetchLists();
    }
  }, [deleteResult, fetchLists]);

  const handleExport = useCallback(
    async ({ id }: { id: string }) => {
      try {
        setExportingListIds((ids) => [...ids, id]);
        const blob = await exportList({ http, listId: id, signal: new AbortController().signal });
        setExportDownload({ name: id, blob });
      } catch (error) {
        addError(error, { title: i18n.EXPORT_ERROR });
      } finally {
        setExportingListIds((ids) => [...ids.filter((_id) => _id !== id)]);
      }
    },
    [addError, http]
  );

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

  const tableItems = (lists.result?.data ?? []).map((item) => ({
    ...item,
    isDeleting: deletingListIds.includes(item.id),
    isExporting: exportingListIds.includes(item.id),
  }));

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: lists.result?.total ?? 0,
    hidePerPageOptions: true,
  };
  const columns = buildColumns(handleExport, handleDelete);

  return (
    <EuiOverlayMask onClick={onClose}>
      <EuiModal onClose={onClose} maxWidth={800}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <ValueListsForm onSuccess={handleUploadSuccess} onError={handleUploadError} />
          <EuiSpacer />
          <EuiPanel>
            <EuiText size="s">
              <h2>{i18n.TABLE_TITLE}</h2>
            </EuiText>
            <EuiBasicTable
              data-test-subj="value-lists-table"
              columns={columns}
              items={tableItems}
              loading={lists.loading}
              onChange={handleTableChange}
              pagination={pagination}
            />
          </EuiPanel>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButton data-test-subj="value-lists-modal-close-action" onClick={onClose}>
            {i18n.CLOSE_BUTTON}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
      <AutoDownload
        blob={exportDownload.blob}
        name={exportDownload.name}
        onDownload={() => setExportDownload({})}
      />
    </EuiOverlayMask>
  );
};

ValueListsModalComponent.displayName = 'ValueListsModalComponent';

export const ValueListsModal = React.memo(ValueListsModalComponent);

ValueListsModal.displayName = 'ValueListsModal';
