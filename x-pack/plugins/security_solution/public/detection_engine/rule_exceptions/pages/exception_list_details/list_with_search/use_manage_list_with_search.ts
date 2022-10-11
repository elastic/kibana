/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import type { GetExceptionItemProps } from '@kbn/securitysolution-exception-list-components';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import {
  prepareFetchExceptionItemsParams,
  fetchListExceptionItems,
  getExceptionItemsReferences,
  deleteExceptionListItem,
} from '../api';
import * as i18n from '../translations';
import { useExceptionListDetailsContext } from '../context';

export const useManageListWithSearchComponent = (list: ExceptionListSchema) => {
  const {
    isReadOnly,
    toasts,
    http,
    pagination,
    exceptions,
    exceptionListReferences,
    setExceptions,
    setPagination,
    setExceptionListReferences,
  } = useExceptionListDetailsContext();
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus | string>(ViewerStatus.LOADING);

  const [lastUpdated, setLastUpdated] = useState<null | string | number>(null);

  const handleErrorStatus = useCallback(
    (error) => {
      toasts?.addError(error, {
        title: i18n.EXCEPTION_ERROR_TITLE,
        toastMessage: i18n.EXCEPTION_ERROR_DESCRIPTION,
      });
      setViewerStatus(ViewerStatus.ERROR);
    },
    [toasts]
  );
  const getReferences = useCallback(async () => {
    try {
      const result = await getExceptionItemsReferences(list);
      setExceptionListReferences(result);
    } catch (error) {
      handleErrorStatus(error);
    }
  }, [handleErrorStatus, list, setExceptionListReferences]);

  const updateViewer = useCallback(
    (paginationResult, dataLength, viewStatus) => {
      setPagination(paginationResult);
      setLastUpdated(Date.now());

      setTimeout(() => {
        if (viewStatus === ViewerStatus.EMPTY_SEARCH)
          setViewerStatus(!dataLength ? viewStatus : '');
        else setViewerStatus(!dataLength ? ViewerStatus.EMPTY : '');
      }, 200);
    },
    [setPagination]
  );

  const fetchItems = useCallback(
    async (options?, viewStatus?) => {
      try {
        const { data, pagination: paginationResult } = await fetchListExceptionItems({
          http,
          ...prepareFetchExceptionItemsParams(null, list, options),
        });
        setExceptions(data);
        getReferences();
        updateViewer(paginationResult, data.length, viewStatus);
      } catch (error) {
        handleErrorStatus(error);
      }
    },
    [http, list, setExceptions, getReferences, updateViewer, handleErrorStatus]
  );

  useEffect(() => {
    fetchItems(null, ViewerStatus.LOADING);
  }, [fetchItems]);

  const emptyViewerTitle = useMemo(() => {
    return viewerStatus === ViewerStatus.EMPTY ? i18n.EXCEPTION_LIST_EMPTY_VIEWER_TITLE : '';
  }, [viewerStatus]);

  const emptyViewerBody = useMemo(() => {
    return viewerStatus === ViewerStatus.EMPTY
      ? i18n.EXCEPTION_LIST_EMPTY_VIEWER_BODY(list.name)
      : '';
  }, [list.name, viewerStatus]);

  // #region Callbacks
  const onPaginationChange = useCallback(
    async (options) => {
      fetchItems(options);
    },
    [fetchItems]
  );
  const onSearch = useCallback(
    async (options?: GetExceptionItemProps) => {
      setViewerStatus(ViewerStatus.SEARCHING);
      fetchItems(options, ViewerStatus.EMPTY_SEARCH);
    },
    [fetchItems]
  );

  const onAddExceptionClick = () => {};
  const onDeleteException = useCallback(
    async ({ id, name, namespaceType }) => {
      try {
        // setViewerStatus(ViewerStatus.DELETING); // TODO ASK YARA if it is needed or it can be replaced with Loading
        setViewerStatus(ViewerStatus.LOADING);
        await deleteExceptionListItem({ id, http, namespaceType });
        toasts?.addSuccess({
          title: i18n.EXCEPTION_ITEM_DELETE_TITLE,
          text: i18n.EXCEPTION_ITEM_DELETE_TEXT(name),
        });
        fetchItems();
      } catch (error) {
        handleErrorStatus(error);
      }
    },
    [http, toasts, fetchItems, handleErrorStatus]
  );
  const onEditExceptionItem = (exception: ExceptionListItemSchema) => {};
  const onCreateExceptionListItem = useCallback(() => {}, []);
  // #endregion

  return {
    listName: list.name,
    isReadOnly,
    exceptions,
    listType: list.type,
    lastUpdated,
    pagination,
    viewerStatus,
    emptyViewerTitle,
    emptyViewerBody,
    ruleReferences: exceptionListReferences,
    onSearch,
    onAddExceptionClick,
    onDeleteException,
    onEditExceptionItem,
    onPaginationChange,
    onCreateExceptionListItem,
  };
};
