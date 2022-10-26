/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import type {
  GetExceptionItemProps,
  RuleReferences,
} from '@kbn/securitysolution-exception-list-components';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import {
  prepareFetchExceptionItemsParams,
  fetchListExceptionItems,
  getExceptionItemsReferences,
  deleteException,
} from '../api';
import * as i18n from '../translations';
import { useExceptionListDetailsContext } from '../context';
import type { ExceptionListWithRules } from '../types';

export const useManageListWithSearchComponent = (list: ExceptionListWithRules) => {
  const {
    viewerStatus,
    isReadOnly,
    toasts,
    http,
    pagination,
    exceptions,
    exceptionListReferences,
    showAddExceptionFlyout,
    showEditExceptionFlyout,
    setExceptions,
    setPagination,
    setExceptionListReferences,
    setViewerStatus,
    handleErrorStatus,
    setShowAddExceptionFlyout,
    setShowEditExceptionFlyout,
  } = useExceptionListDetailsContext();

  const [lastUpdated, setLastUpdated] = useState<null | string | number>(null);
  const [exceptionToEdit, setExceptionToEdit] = useState<ExceptionListItemSchema>();

  const getReferences = useCallback(async () => {
    try {
      const result: RuleReferences = await getExceptionItemsReferences(list);
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
    [setPagination, setViewerStatus]
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
    [fetchItems, setViewerStatus]
  );

  const onAddExceptionClick = useCallback(() => {
    debugger;
    setShowAddExceptionFlyout(true);
  }, [setShowAddExceptionFlyout]);

  const onDeleteException = useCallback(
    async ({ id, name, namespaceType }) => {
      try {
        // setViewerStatus(ViewerStatus.DELETING); // TODO ASK YARA if it is needed or it can be replaced with Loading
        setViewerStatus(ViewerStatus.LOADING);
        await deleteException({ id, http, namespaceType });
        toasts?.addSuccess({
          title: i18n.EXCEPTION_ITEM_DELETE_TITLE,
          text: i18n.EXCEPTION_ITEM_DELETE_TEXT(name),
        });
        fetchItems();
      } catch (error) {
        handleErrorStatus(error);
      }
    },
    [http, toasts, fetchItems, handleErrorStatus, setViewerStatus]
  );
  const onEditExceptionItem = (exception: ExceptionListItemSchema) => {
    setExceptionToEdit(exception);
    setShowEditExceptionFlyout(true);
  };
  const onCreateExceptionListItem = useCallback(() => {}, []);

  const handleCancelExceptionItemFlyout = () => {
    setShowAddExceptionFlyout(false);
    setShowEditExceptionFlyout(false);
  };
  const handleConfirmExceptionFlyout = useCallback(
    (didExceptionChange: boolean): void => {
      // && onRuleChange != null) {
      // onRuleChange();

      setShowAddExceptionFlyout(false);
      setShowEditExceptionFlyout(false);
      if (!didExceptionChange) return;
      fetchItems();
    },
    [fetchItems, setShowAddExceptionFlyout, setShowEditExceptionFlyout]
  );
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
    showAddExceptionFlyout,
    showEditExceptionFlyout,
    exceptionToEdit,
    onSearch,
    onAddExceptionClick,
    onDeleteException,
    onEditExceptionItem,
    onPaginationChange,
    onCreateExceptionListItem,
    handleCancelExceptionItemFlyout,
    handleConfirmExceptionFlyout,
  };
};
