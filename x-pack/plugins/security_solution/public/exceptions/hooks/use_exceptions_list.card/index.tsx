/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ExceptionListItemSchema,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import { useGeneratedHtmlId } from '@elastic/eui';
import type { ExceptionListInfo } from '../use_all_exception_lists';
import { useListExceptionItems } from '../use_list_exception_items';
import * as i18n from '../../translations/translations';
import * as i18nListDetails from '../../translations/list_details.translations';
import { checkIfListCannotBeEdited } from '../../utils/list.utils';

interface ListAction {
  id: string;
  listId: string;
  namespaceType: NamespaceType;
}
export const useExceptionsListCard = ({
  exceptionsList,
  handleExport,
  handleDelete,
}: {
  exceptionsList: ExceptionListInfo;
  handleExport: ({ id, listId, namespaceType }: ListAction) => () => Promise<void>;
  handleDelete: ({ id, listId, namespaceType }: ListAction) => () => Promise<void>;
}) => {
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus | string>(ViewerStatus.LOADING);
  const [exceptionToEdit, setExceptionToEdit] = useState<ExceptionListItemSchema>();
  const [showEditExceptionFlyout, setShowEditExceptionFlyout] = useState(false);

  const {
    name: listName,
    list_id: listId,
    rules: listRules,
    created_by: createdBy,
    created_at: createdAt,
    description: listDescription,
  } = exceptionsList;

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
    deleteToastTitle: i18nListDetails.EXCEPTION_ITEM_DELETE_TITLE,
    deleteToastBody: (name) => i18nListDetails.EXCEPTION_ITEM_DELETE_TEXT(name),
    errorToastBody: i18nListDetails.EXCEPTION_ERROR_DESCRIPTION,
    errorToastTitle: i18nListDetails.EXCEPTION_ERROR_TITLE,
    onEditListExceptionItem: onEditExceptionItem,
    onFinishFetchingExceptions,
  });

  useEffect(() => {
    fetchItems(null, ViewerStatus.LOADING);
  }, [fetchItems]);

  const [toggleAccordion, setToggleAccordion] = useState(false);
  const openAccordionId = useGeneratedHtmlId({ prefix: 'openAccordion' });

  const listCannotBeEdited = checkIfListCannotBeEdited(exceptionsList);

  const menuActionItems = useMemo(
    () => [
      {
        key: '1',
        icon: 'exportAction',
        label: i18n.EXPORT_EXCEPTION_LIST,
        onClick: (e: React.MouseEvent<Element, MouseEvent>) => {
          handleExport({
            id: exceptionsList.id,
            listId: exceptionsList.list_id,
            namespaceType: exceptionsList.namespace_type,
          })();
        },
      },
      {
        key: '2',
        icon: 'trash',
        disabled: listCannotBeEdited,
        label: i18n.DELETE_EXCEPTION_LIST,
        onClick: (e: React.MouseEvent<Element, MouseEvent>) => {
          handleDelete({
            id: exceptionsList.id,
            listId: exceptionsList.list_id,
            namespaceType: exceptionsList.namespace_type,
          })();
        },
      },
    ],
    [
      exceptionsList.id,
      exceptionsList.list_id,
      exceptionsList.namespace_type,
      handleDelete,
      handleExport,
      listCannotBeEdited,
    ]
  );

  return {
    listId,
    listName,
    listDescription,
    createdAt: new Date(createdAt).toDateString(),
    createdBy,
    listRulesCount: listRules.length.toString(),

    menuActionItems,

    toggleAccordion,
    openAccordionId,
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
    setToggleAccordion,
  };
};
