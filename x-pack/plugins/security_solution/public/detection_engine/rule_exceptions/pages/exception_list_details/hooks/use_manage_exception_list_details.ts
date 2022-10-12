/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState } from 'react';
import type { ListDetails } from '@kbn/securitysolution-exception-list-components';
import { useExceptionListDetailsContext } from '../context';
import type { ExceptionListDetailsComponentProps } from '../types';
import { deleteList, exportList, updateList } from '../api';

export const useManageExceptionListDetails = ({
  isReadOnly,
  list,
}: ExceptionListDetailsComponentProps) => {
  const [exportedList, setExportedList] = useState<Blob>();
  const { name: listName, description: listDescription, list_id: listId } = list;

  const { toasts, viewerStatus, http, setIsReadOnly, handleErrorStatus } =
    useExceptionListDetailsContext();
  useEffect(() => {
    setIsReadOnly(isReadOnly);
  }, [isReadOnly, setIsReadOnly]);

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
            description: listDetails.description,
          },
        });
      } catch (error) {
        handleErrorStatus(error);
      }
    },
    [handleErrorStatus, http, list.id, list.list_id, list.type]
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
      toasts?.addSuccess(`${listName} Successfully exported`);
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
      toasts?.addSuccess(`${listName} Successfully deleted`);
      // TODO redirect to all lists
    } catch (error) {
      handleErrorStatus(error);
    }
  }, [handleErrorStatus, http, list.id, list.namespace_type, listName, toasts]);

  return {
    exportedList,
    viewerStatus,
    listName,
    listDescription,
    listId,
    onEditListDetails,
    onExportList,
    onDeleteList,
  };
};
