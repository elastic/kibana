/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useApi } from '@kbn/securitysolution-list-hooks';

import { formatExceptionItemForUpdate } from '../utils/helpers';
import { useKibana } from '../../../common/lib/kibana';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

/**
 * Adds exception items to the list or updates exception if it's an existing one
 *
 * @param ruleStaticId static id of the rule (rule.ruleId, not rule.id) where the exception updates will be applied
 * @param exceptionItemsToAddOrUpdate array of ExceptionListItemSchema to add or update
 * @param alertIdToClose - optional string representing alert to close
 * @param bulkCloseIndex - optional index used to create bulk close query
 *
 */
export type AddOrUpdateExceptionItemsFunc = (
  exceptionItemsToAddOrUpdate: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
) => Promise<void>;

export type ReturnUseAddOrUpdateException = [boolean, AddOrUpdateExceptionItemsFunc | null];

/**
 * Hook for adding and updating an exception item
 *
 */
export const useAddOrUpdateException = (): ReturnUseAddOrUpdateException => {
  const { services } = useKibana();
  const { addSuccess, addError } = useAppToasts();
  const [isLoading, setIsLoading] = useState(false);
  const addOrUpdateExceptionRef = useRef<AddOrUpdateExceptionItemsFunc | null>(null);
  const { addExceptionListItem, updateExceptionListItem } = useApi(services.http);
  const addOrUpdateException = useCallback<AddOrUpdateExceptionItemsFunc>(
    async (exceptionItemsToAddOrUpdate) => {
      if (addOrUpdateExceptionRef.current != null) {
        addOrUpdateExceptionRef.current(exceptionItemsToAddOrUpdate);
      }
    },
    []
  );

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const onUpdateExceptionItemsAndAlertStatus: AddOrUpdateExceptionItemsFunc = async (
      exceptionItemsToAddOrUpdate
    ) => {
      const addOrUpdateItems = async (
        exceptionListItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
      ): Promise<ExceptionListItemSchema[]> => {
        return Promise.all(
          exceptionListItems.map(
            (item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
              if ('id' in item && item.id != null) {
                const formattedExceptionItem = formatExceptionItemForUpdate(item);
                return updateExceptionListItem({
                  listItem: formattedExceptionItem,
                });
              } else {
                return addExceptionListItem({
                  listItem: item,
                });
              }
            }
          )
        );
      };

      try {
        setIsLoading(true);

        const itemsAdded = await addOrUpdateItems(exceptionItemsToAddOrUpdate);
        if (isSubscribed) {
          setIsLoading(false);
          const sharedListNames = itemsAdded.map((item) => item.name);
          addSuccess({
            title: i18n.ADD_EXCEPTION_SUCCESS,
            text: i18n.ADD_EXCEPTION_SUCCESS_DETAILS(sharedListNames.join(',')),
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setIsLoading(false);
          addError(error, { title: i18n.ADD_EXCEPTION_ERROR });
        }
      }
    };

    addOrUpdateExceptionRef.current = onUpdateExceptionItemsAndAlertStatus;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [addExceptionListItem, updateExceptionListItem, addSuccess, addError]);

  return [isLoading, addOrUpdateException];
};
