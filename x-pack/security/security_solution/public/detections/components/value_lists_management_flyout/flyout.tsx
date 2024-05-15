/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { isEmpty } from 'lodash/fp';
import {
  EuiBasicTable,
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useFindLists, useDeleteList, useCursor } from '@kbn/securitysolution-list-hooks';

import { exportList } from '@kbn/securitysolution-list-api';

import { useKibana } from '../../../common/lib/kibana';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { buildColumns } from './table_helpers';
import { ValueListsForm } from './form';
import { ReferenceErrorModal } from './reference_error_modal';
import { AutoDownload } from '../../../common/components/auto_download/auto_download';

interface ValueListsFlyoutProps {
  onClose: () => void;
  showFlyout: boolean;
}

interface ReferenceFlyoutState {
  contentText: string;
  exceptionListReferences: string[];
  isLoading: boolean;
  valueListId: string;
}

const referenceModalInitialState: ReferenceFlyoutState = {
  contentText: '',
  exceptionListReferences: [],
  isLoading: false,
  valueListId: '',
};

export const ValueListsFlyoutComponent: React.FC<ValueListsFlyoutProps> = ({
  onClose,
  showFlyout,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [cursor, setCursor] = useCursor({ pageIndex, pageSize });
  const { http } = useKibana().services;
  const { start: findLists, ...lists } = useFindLists();
  const { start: deleteList, result: deleteResult, error: deleteError } = useDeleteList();
  const [deletingListIds, setDeletingListIds] = useState<string[]>([]);
  const [exportingListIds, setExportingListIds] = useState<string[]>([]);
  const [exportDownload, setExportDownload] = useState<{ name?: string; blob?: Blob }>({});
  const { addError, addSuccess } = useAppToasts();
  const [showReferenceErrorModal, setShowReferenceErrorModal] = useState<boolean>(false);
  const [referenceFlyoutState, setReferenceFlyoutState] = useState<ReferenceFlyoutState>(
    referenceModalInitialState
  );

  const fetchLists = useCallback(() => {
    findLists({
      cursor,
      http,
      pageIndex: pageIndex + 1,
      pageSize,
      sortOrder: 'desc',
      sortField: 'created_at',
    });
  }, [cursor, http, findLists, pageIndex, pageSize]);

  const handleDelete = useCallback(
    ({
      deleteReferences,
      id,
    }: {
      deleteReferences?: boolean;
      id: string;
      ignoreReferences?: boolean;
    }) => {
      setDeletingListIds([...deletingListIds, id]);
      deleteList({ deleteReferences, http, id });
    },
    [deleteList, deletingListIds, http]
  );

  const handleReferenceDelete = useCallback(async () => {
    setShowReferenceErrorModal(false);
    deleteList({ deleteReferences: true, http, id: referenceFlyoutState.valueListId });
    setReferenceFlyoutState(referenceModalInitialState);
    setDeletingListIds([]);
  }, [deleteList, http, referenceFlyoutState.valueListId]);

  useEffect(() => {
    if (deleteResult != null) {
      setDeletingListIds((ids) => [...ids.filter((id) => id !== deleteResult.id)]);
      fetchLists();
    }
  }, [deleteResult, fetchLists]);

  useEffect(() => {
    if (!isEmpty(deleteError)) {
      const references: string[] =
        // deleteError response unknown message.error.references
        // @ts-expect-error TS2571
        deleteError?.body?.message?.error?.references?.map(
          // response not typed
          // @ts-expect-error TS7006
          (ref) => ref?.exception_list.name
        ) ?? [];
      const uniqueExceptionListReferences = Array.from(new Set(references));
      setShowReferenceErrorModal(true);
      setReferenceFlyoutState({
        contentText: i18n.referenceErrorMessage(uniqueExceptionListReferences.length),
        exceptionListReferences: uniqueExceptionListReferences,
        isLoading: false,
        // deleteError response unknown
        // @ts-expect-error TS2571
        valueListId: deleteError?.body?.message?.error?.value_list_id,
      });
    }
  }, [deleteError]);

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
      setPageIndex(0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addSuccess]
  );

  useEffect(() => {
    if (showFlyout) {
      fetchLists();
    }
  }, [showFlyout, fetchLists]);

  useEffect(() => {
    if (!lists.loading && lists.result?.cursor) {
      setCursor(lists.result.cursor);
    }
  }, [lists.loading, lists.result, setCursor]);

  const handleCloseReferenceErrorModal = useCallback(() => {
    setDeletingListIds([]);
    setShowReferenceErrorModal(false);
    setReferenceFlyoutState({
      contentText: '',
      exceptionListReferences: [],
      isLoading: false,
      valueListId: '',
    });
  }, []);

  if (!showFlyout) {
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
    showPerPageOptions: false,
  };
  const columns = buildColumns(handleExport, handleDelete);

  return (
    <>
      <EuiFlyout onClose={onClose} maxWidth={800}>
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>{i18n.VALUE_LISTS_FLYOUT_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <ValueListsForm onSuccess={handleUploadSuccess} onError={handleUploadError} />
          <EuiSpacer />
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
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiButton data-test-subj="value-lists-flyout-close-action" onClick={onClose}>
            {i18n.CLOSE_BUTTON}
          </EuiButton>
        </EuiFlyoutFooter>
      </EuiFlyout>
      <ReferenceErrorModal
        cancelText={i18n.REFERENCE_MODAL_CANCEL_BUTTON}
        confirmText={i18n.REFERENCE_MODAL_CONFIRM_BUTTON}
        contentText={referenceFlyoutState.contentText}
        onCancel={handleCloseReferenceErrorModal}
        onClose={handleCloseReferenceErrorModal}
        onConfirm={handleReferenceDelete}
        references={referenceFlyoutState.exceptionListReferences}
        showModal={showReferenceErrorModal}
        titleText={i18n.REFERENCE_MODAL_TITLE}
      />
      <AutoDownload
        blob={exportDownload.blob}
        name={exportDownload.name}
        onDownload={() => setExportDownload({})}
      />
    </>
  );
};

ValueListsFlyoutComponent.displayName = 'ValueListsFlyoutComponent';

export const ValueListsFlyout = React.memo(ValueListsFlyoutComponent);

ValueListsFlyout.displayName = 'ValueListsFlyout';
