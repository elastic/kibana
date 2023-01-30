/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import type { GetExceptionItemProps } from '@kbn/securitysolution-exception-list-components';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';

import * as i18n from '../../translations';
import { useListExceptionItems } from '..';

export const useListWithSearchComponent = (
  list: ExceptionListSchema,
  refreshExceptions?: boolean
) => {
  const [showAddExceptionFlyout, setShowAddExceptionFlyout] = useState(false);
  const [showEditExceptionFlyout, setShowEditExceptionFlyout] = useState(false);
  const [exceptionToEdit, setExceptionToEdit] = useState<ExceptionListItemSchema>();
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus | string>(ViewerStatus.LOADING);

  const onFinishFetchingExceptions = useCallback(() => {
    setViewerStatus('');
  }, [setViewerStatus]);

  const onEditExceptionItem = (exception: ExceptionListItemSchema) => {
    setExceptionToEdit(exception);
    setShowEditExceptionFlyout(true);
  };
  const {
    exceptionViewerStatus,
    exceptions,
    lastUpdated,
    pagination,
    ruleReferences: exceptionListReferences,
    fetchItems,
    onDeleteException,
    onPaginationChange,
  } = useListExceptionItems({
    list,
    deleteToastTitle: i18n.EXCEPTION_ITEM_DELETE_TITLE,
    deleteToastBody: (name) => i18n.EXCEPTION_ITEM_DELETE_TEXT(name),
    errorToastBody: i18n.EXCEPTION_ERROR_DESCRIPTION,
    errorToastTitle: i18n.EXCEPTION_ERROR_TITLE,
    onEditListExceptionItem: onEditExceptionItem,
    onFinishFetchingExceptions,
  });

  useEffect(() => {
    fetchItems(null, ViewerStatus.LOADING);
  }, [fetchItems, refreshExceptions]);

  const emptyViewerTitle = useMemo(() => {
    return viewerStatus === ViewerStatus.EMPTY ? i18n.EXCEPTION_LIST_EMPTY_VIEWER_TITLE : '';
  }, [viewerStatus]);

  const emptyViewerBody = useMemo(() => {
    return viewerStatus === ViewerStatus.EMPTY
      ? i18n.EXCEPTION_LIST_EMPTY_VIEWER_BODY(list.name)
      : '';
  }, [list.name, viewerStatus]);

  const emptyViewerButtonText = useMemo(() => {
    return list.type === ExceptionListTypeEnum.ENDPOINT
      ? i18n.EXCEPTION_LIST_EMPTY_VIEWER_BUTTON_ENDPOINT
      : i18n.EXCEPTION_LIST_EMPTY_VIEWER_BUTTON;
  }, [list.type]);

  // #region Callbacks

  const onSearch = useCallback(
    async (options?: GetExceptionItemProps) => {
      setViewerStatus(ViewerStatus.SEARCHING);
      fetchItems(options, ViewerStatus.EMPTY_SEARCH);
    },
    [fetchItems, setViewerStatus]
  );

  const onAddExceptionClick = useCallback(() => {
    setShowAddExceptionFlyout(true);
    fetchItems();
  }, [fetchItems, setShowAddExceptionFlyout]);

  const handleCancelExceptionItemFlyout = () => {
    setShowAddExceptionFlyout(false);
    setShowEditExceptionFlyout(false);
  };
  const handleConfirmExceptionFlyout = useCallback(
    (didExceptionChange: boolean): void => {
      setShowAddExceptionFlyout(false);
      setShowEditExceptionFlyout(false);
      if (!didExceptionChange) return;
      fetchItems();
    },
    [fetchItems, setShowAddExceptionFlyout, setShowEditExceptionFlyout]
  );
  // #endregion

  return {
    exceptionViewerStatus,
    listName: list.name,
    exceptions,
    listType: list.type,
    lastUpdated,
    pagination,
    viewerStatus,
    emptyViewerTitle,
    emptyViewerBody,
    emptyViewerButtonText,
    ruleReferences: exceptionListReferences,
    showAddExceptionFlyout,
    showEditExceptionFlyout,
    exceptionToEdit,
    onSearch,
    onAddExceptionClick,
    onDeleteException,
    onEditExceptionItem,
    onPaginationChange,
    handleCancelExceptionItemFlyout,
    handleConfirmExceptionFlyout,
  };
};
