/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect } from 'react';
import type { ListDetails } from '@kbn/securitysolution-exception-list-components';
import { useExceptionListDetailsContext } from '../context';
import type { ExceptionListDetailsComponentProps } from '../types';
import { updateExceptionListDetails } from '../api';
import * as i18n from '../translations';

export const useManageExceptionListDetails = ({
  isReadOnly,
  list,
}: ExceptionListDetailsComponentProps) => {
  const { name: listName, description: listDescription, list_id: listId } = list;

  const { setIsReadOnly, toasts, http } = useExceptionListDetailsContext();
  useEffect(() => {
    setIsReadOnly(isReadOnly);
  }, [isReadOnly, setIsReadOnly]);

  const onEditListDetails = (listDetails: ListDetails) => {
    try {
      updateExceptionListDetails({
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
      //  handleErrorStatus(error);
      toasts?.addError(error, {
        title: i18n.EXCEPTION_ERROR_TITLE,
        toastMessage: i18n.EXCEPTION_ERROR_DESCRIPTION,
      });
    }
  };
  const onExportList = () => {};
  const onDeleteList = () => {};

  return { listName, listDescription, listId, onEditListDetails, onExportList, onDeleteList };
};
