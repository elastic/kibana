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
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import { useGeneratedHtmlId } from '@elastic/eui';
import { useGetSecuritySolutionLinkProps } from '../../../common/components/links';
import { SecurityPageName } from '../../../../common/constants';
import type { ExceptionListInfo } from '../use_all_exception_lists';
import { useListExceptionItems } from '../use_list_exception_items';
import * as i18n from '../../translations';
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
  handleManageRules,
}: {
  exceptionsList: ExceptionListInfo;
  handleExport: ({ id, listId, namespaceType }: ListAction) => () => Promise<void>;
  handleDelete: ({ id, listId, namespaceType }: ListAction) => () => Promise<void>;
  handleManageRules: () => void;
}) => {
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus | string>(ViewerStatus.LOADING);
  const [exceptionToEdit, setExceptionToEdit] = useState<ExceptionListItemSchema>();
  const [showAddExceptionFlyout, setShowAddExceptionFlyout] = useState(false);
  const [showEditExceptionFlyout, setShowEditExceptionFlyout] = useState(false);

  const {
    name: listName,
    list_id: listId,
    rules: listRules,
    type: listType,
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

  const [toggleAccordion, setToggleAccordion] = useState(false);
  const openAccordionId = useGeneratedHtmlId({ prefix: 'openAccordion' });

  const listCannotBeEdited = checkIfListCannotBeEdited(exceptionsList);

  const emptyViewerTitle = useMemo(() => {
    return viewerStatus === ViewerStatus.EMPTY ? i18n.EXCEPTION_LIST_EMPTY_VIEWER_TITLE : '';
  }, [viewerStatus]);

  const emptyViewerBody = useMemo(() => {
    return viewerStatus === ViewerStatus.EMPTY
      ? i18n.EXCEPTION_LIST_EMPTY_VIEWER_BODY(exceptionsList.name)
      : '';
  }, [exceptionsList.name, viewerStatus]);

  const emptyViewerButtonText = useMemo(() => {
    return exceptionsList.type === ExceptionListTypeEnum.ENDPOINT
      ? i18n.EXCEPTION_LIST_EMPTY_VIEWER_BUTTON_ENDPOINT
      : i18n.EXCEPTION_LIST_EMPTY_VIEWER_BUTTON;
  }, [exceptionsList.type]);

  const menuActionItems = useMemo(
    () => [
      {
        key: 'Export',
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
        key: 'Delete',
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
      {
        key: 'ManageRules',
        icon: 'gear',
        disabled: listCannotBeEdited,
        label: 'Manage Rules',
        onClick: (e: React.MouseEvent<Element, MouseEvent>) => {
          handleManageRules();
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
      handleManageRules,
    ]
  );

  // Once details Page is added all of these methods will be used from it as well
  // as their own states
  const onAddExceptionClick = useCallback(() => {
    setShowAddExceptionFlyout(true);
  }, [setShowAddExceptionFlyout]);

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

  // routes to x-pack/plugins/security_solution/public/exceptions/routes.tsx
  // details component is here: x-pack/plugins/security_solution/public/exceptions/pages/list_detail_view/index.tsx
  const { onClick: goToExceptionDetail } = useGetSecuritySolutionLinkProps()({
    deepLinkId: SecurityPageName.exceptions,
    path: `/details/${exceptionsList.list_id}`,
  });
  return {
    listId,
    listName,
    listDescription,
    createdAt: new Date(createdAt).toDateString(),
    createdBy,
    listRulesCount: listRules.length.toString(),
    exceptionItemsCount: pagination.totalItemCount.toString(),
    listType,
    menuActionItems,
    showAddExceptionFlyout,
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
    onAddExceptionClick,
    handleConfirmExceptionFlyout,
    handleCancelExceptionItemFlyout,
    goToExceptionDetail,
    emptyViewerTitle,
    emptyViewerBody,
    emptyViewerButtonText,
  };
};
