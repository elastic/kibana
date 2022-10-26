/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState, useMemo } from 'react';
import type { ListDetails } from '@kbn/securitysolution-exception-list-components';
import { useExceptionListDetailsContext } from './context';
import type { ExceptionListDetailsComponentProps } from './types';
import { deleteList, exportList, updateList } from './api';
import { mapListRulesToUIRules } from './utils';
import * as i18n from './translations';

export const useManageExceptionListDetails = ({
  isReadOnly,
  list,
}: ExceptionListDetailsComponentProps) => {
  const [showManageRulesFlyout, setShowManageRulesFlyout] = useState(false);
  const [exportedList, setExportedList] = useState<Blob>();
  const [canUserEditDetails, setCanUserEditDetails] = useState(true);
  const { name: listName, description: listDescription, list_id: listId, rules: allRules } = list;
  const linkedRules = useMemo(() => mapListRulesToUIRules(list.rules), [list.rules]);

  const { toasts, viewerStatus, http, setIsReadOnly, handleErrorStatus } =
    useExceptionListDetailsContext();

  useEffect(() => {
    if (list.list_id === 'endpoint_list') return setCanUserEditDetails(false);

    setIsReadOnly(isReadOnly);
  }, [isReadOnly, list.list_id, setIsReadOnly]);

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
    canUserEditDetails,
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
