/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import type { Pagination } from '@elastic/eui';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import type { RuleReferences } from '@kbn/securitysolution-exception-list-components';
import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import {
  deleteException,
  fetchListExceptionItems,
  getExceptionItemsReferences,
  prepareFetchExceptionItemsParams,
} from '../../api';

export interface UseListExceptionItemsProps {
  list: ExceptionListSchema;
  deleteToastTitle: string;
  deleteToastBody: (exceptionName: string) => string;
  errorToastTitle: string;
  errorToastBody: string;
  onEditListExceptionItem: (exceptionItem: ExceptionListItemSchema) => void;
  onFinishFetchingExceptions?: () => void;
}

export const useListExceptionItems = ({
  list,
  deleteToastTitle,
  deleteToastBody,
  errorToastTitle,
  errorToastBody,
  onEditListExceptionItem,
  onFinishFetchingExceptions,
}: UseListExceptionItemsProps) => {
  const { services } = useKibana();
  const { http } = services;
  const toasts = useToasts();

  const [exceptions, setExceptions] = useState<ExceptionListItemSchema[]>([]);
  const [exceptionListReferences, setExceptionListReferences] = useState<RuleReferences>({});
  const [pagination, setPagination] = useState<Pagination & { pageSize: number }>({
    pageIndex: 0,
    pageSize: 0,
    totalItemCount: 0,
  });
  const [lastUpdated, setLastUpdated] = useState<null | string | number>(null);
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus | ''>('');

  const handleErrorStatus = useCallback(
    (error: Error, errorTitle?: string, errorDescription?: string) => {
      toasts?.addError(error, {
        title: errorTitle || errorToastTitle,
        toastMessage: errorDescription || errorToastBody,
      });
      setViewerStatus(ViewerStatus.ERROR);
    },
    [errorToastBody, errorToastTitle, toasts]
  );

  const getReferences = useCallback(async () => {
    try {
      const result: RuleReferences = await getExceptionItemsReferences([list]);
      setExceptionListReferences(result);
    } catch (error) {
      handleErrorStatus(error);
    }
  }, [handleErrorStatus, list, setExceptionListReferences]);

  const updateViewer = useCallback((paginationResult, dataLength, viewStatus) => {
    setPagination(paginationResult);
    setLastUpdated(Date.now());
    setTimeout(() => {
      if (viewStatus === ViewerStatus.EMPTY_SEARCH)
        return setViewerStatus(!dataLength ? viewStatus : '');

      setViewerStatus(!dataLength ? ViewerStatus.EMPTY : '');
    }, 200);
  }, []);

  const fetchItems = useCallback(
    async (options?, viewStatus?) => {
      try {
        setViewerStatus(ViewerStatus.LOADING);
        const { data, pagination: paginationResult } = await fetchListExceptionItems({
          http,
          ...prepareFetchExceptionItemsParams(null, list, options),
        });
        setExceptions(data);
        getReferences();
        updateViewer(paginationResult, data.length, viewStatus);
        if (typeof onFinishFetchingExceptions === 'function') onFinishFetchingExceptions();
      } catch (error) {
        handleErrorStatus(error);
      }
    },
    [http, list, getReferences, updateViewer, onFinishFetchingExceptions, handleErrorStatus]
  );

  const onDeleteException = useCallback(
    async ({ id, name, namespaceType }) => {
      try {
        setViewerStatus(ViewerStatus.LOADING);
        await deleteException({ id, http, namespaceType });
        toasts?.addSuccess({
          title: deleteToastTitle,
          text: typeof deleteToastBody === 'function' ? deleteToastBody(name) : '',
        });
        fetchItems();
      } catch (error) {
        handleErrorStatus(error);
      }
    },
    [http, toasts, deleteToastTitle, deleteToastBody, fetchItems, handleErrorStatus]
  );
  const onEditExceptionItem = (exception: ExceptionListItemSchema) => {
    if (typeof onEditListExceptionItem === 'function') onEditListExceptionItem(exception);
  };
  const onPaginationChange = useCallback(
    async (options) => {
      fetchItems(options);
    },
    [fetchItems]
  );
  return {
    exceptions,
    lastUpdated,
    pagination,
    exceptionViewerStatus: viewerStatus,
    ruleReferences: exceptionListReferences,
    fetchItems,
    onDeleteException,
    onEditExceptionItem,
    onPaginationChange,
  };
};
