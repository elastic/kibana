/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState, useMemo } from 'react';
import type { ListDetails } from '@kbn/securitysolution-exception-list-components';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { deleteList, exportList, updateList } from '../../api';
import { checkIfListCannotBeEdited, mapListRulesToUIRules } from '../../utils/list.utils';
import * as i18n from '../../translations';
import type { ExceptionListInfo } from '../use_all_exception_lists';

export const useExceptionListDetails = (list: ExceptionListInfo) => {
  const { name: listName, description: listDescription, list_id: listId, rules: allRules } = list;
  const toasts = useToasts();
  const { services } = useKibana();
  const { http } = services;

  const [showManageRulesFlyout, setShowManageRulesFlyout] = useState(false);
  const [exportedList, setExportedList] = useState<Blob>();
  const [canUserEditList, setCanUserEditList] = useState(true);
  const linkedRules = useMemo(() => mapListRulesToUIRules(list.rules), [list.rules]);
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus | string>('');

  useEffect(() => {
    if (checkIfListCannotBeEdited(list)) return setCanUserEditList(false);
  }, [list, list.list_id]);

  const handleErrorStatus = useCallback(
    (error: Error, errorTitle?: string, errorDescription?: string) => {
      toasts?.addError(error, {
        title: errorTitle || i18n.EXCEPTION_ERROR_TITLE,
        toastMessage: errorDescription || i18n.EXCEPTION_ERROR_DESCRIPTION,
      });
      setViewerStatus(ViewerStatus.ERROR);
    },
    [setViewerStatus, toasts]
  );
  const onEditListDetails = useCallback(
    async (listDetails: ListDetails) => {
      try {
        await updateList({
          http,
          list: {
            id: list.id,
            list_id: list.list_id,
            type: list.type,
            name: listDetails.name,
            description: listDetails.description || list.description,
          },
        });
      } catch (error) {
        handleErrorStatus(error);
      }
    },
    [handleErrorStatus, http, list.description, list.id, list.list_id, list.type]
  );
  const onExportList = useCallback(async () => {
    try {
      const result = await exportList({
        id: list.id,
        http,
        listId,
        namespaceType: list.namespace_type,
      });
      setExportedList(result);
      toasts?.addSuccess(i18n.EXCEPTION_LIST_EXPORTED_SUCCESSFULLY(listName));
    } catch (error) {
      handleErrorStatus(error);
    }
  }, [handleErrorStatus, http, list.id, list.namespace_type, listId, listName, toasts]);

  const onDeleteList = useCallback(async () => {
    try {
      await deleteList({
        id: list.id,
        http,
        namespaceType: list.namespace_type,
      });
      toasts?.addSuccess(i18n.EXCEPTION_LIST_DELETED_SUCCESSFULLY(listName));
      // TODO redirect to all lists
    } catch (error) {
      handleErrorStatus(error);
    }
  }, [handleErrorStatus, http, list.id, list.namespace_type, listName, toasts]);

  const onManageRules = useCallback(() => {
    setShowManageRulesFlyout(true);
  }, []);
  const onSaveManageRules = useCallback(() => {
    // TODO: call API To save
    setShowManageRulesFlyout(false);
  }, []);
  const onCancelManageRules = useCallback(() => {
    setShowManageRulesFlyout(false);
  }, []);
  const onRuleSelectionChange = useCallback(() => {}, []);
  return {
    canUserEditList,
    allRules,
    linkedRules,
    exportedList,
    viewerStatus,
    listName,
    listDescription,
    listId,
    showManageRulesFlyout,
    onEditListDetails,
    onExportList,
    onDeleteList,
    onManageRules,
    onSaveManageRules,
    onCancelManageRules,
    onRuleSelectionChange,
  };
};
