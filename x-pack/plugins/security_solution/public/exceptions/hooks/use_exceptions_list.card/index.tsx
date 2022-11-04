/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import type { ExceptionListInfo } from '../use_all_exception_lists';
import { useListExceptionItems } from '../use_list_exception_items';
import * as i18n from '../../translations/list_details.translations';

export const useExceptionsListCard = ({
  exceptionsList,
}: {
  exceptionsList: ExceptionListInfo;
}) => {
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus | string>(ViewerStatus.LOADING);
  const [exceptionToEdit, setExceptionToEdit] = useState<ExceptionListItemSchema>();
  const [showEditExceptionFlyout, setShowEditExceptionFlyout] = useState(false);

  const onFinishFetchingExceptions = useCallback(() => {
    setViewerStatus('');
  }, [setViewerStatus]);

  const onEditExceptionItem = (exception: ExceptionListItemSchema) => {
    setExceptionToEdit(exception);
    setShowEditExceptionFlyout(true);
  };
  const {
    lastUpdated,
    exceptionViewerStatus,
    exceptions,
    pagination,
    ruleReferences,
    fetchItems,
    onDeleteException,
    onPaginationChange,
  } = useListExceptionItems({
    list: exceptionsList,
    deleteToastTitle: i18n.EXCEPTION_ITEM_DELETE_TITLE,
    deleteToastBody: (name) => i18n.EXCEPTION_ITEM_DELETE_TEXT(name),
    errorToastBody: i18n.EXCEPTION_ERROR_DESCRIPTION,
    errorToastTitle: i18n.EXCEPTION_ERROR_TITLE,
    onEditListExceptionItem: onEditExceptionItem,
    onFinishFetchingExceptions,
  });

  useEffect(() => {
    fetchItems(null, ViewerStatus.LOADING);
  }, [fetchItems]);

  return {
    viewerStatus,
    exceptionToEdit,
    showEditExceptionFlyout,
    lastUpdated,
    exceptions,
    ruleReferences,
    pagination,
    exceptionViewerStatus,
    onEditExceptionItem,
    onDeleteException,
    onPaginationChange,
  };
};
