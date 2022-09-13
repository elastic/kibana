/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useApi } from '@kbn/securitysolution-list-hooks';

import { addExceptionListItem } from '@kbn/securitysolution-list-api';
import { formatExceptionItemForUpdate } from '../utils/helpers';
import { useKibana } from '../../../common/lib/kibana';

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
) => Promise<ExceptionListItemSchema[]>;

export type ReturnUseAddOrUpdateException = [boolean, AddOrUpdateExceptionItemsFunc | null];

/**
 * Hook for adding and updating an exception item
 *
 */
export const useAddOrUpdateException = (): ReturnUseAddOrUpdateException => {
  const {
    services: { http },
  } = useKibana();
  const [isLoading, setIsLoading] = useState(false);
  const addOrUpdateExceptionRef = useRef<AddOrUpdateExceptionItemsFunc | null>(null);
  const { updateExceptionListItem } = useApi(http);

  useEffect(() => {
    const abortCtrl = new AbortController();

    const onUpdateExceptionItemsAndAlertStatus: AddOrUpdateExceptionItemsFunc = async (
      exceptionItemsToAddOrUpdate
    ) => {
      setIsLoading(true);
      const itemsAdded = await Promise.all(
        exceptionItemsToAddOrUpdate.map(
          (item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
            if ('id' in item && item.id != null) {
              const formattedExceptionItem = formatExceptionItemForUpdate(item);
              return updateExceptionListItem({
                listItem: formattedExceptionItem,
              });
            } else {
              return addExceptionListItem({
                http,
                listItem: item,
                signal: abortCtrl.signal,
              });
            }
          }
        )
      );

      setIsLoading(false);

      return itemsAdded;
    };

    addOrUpdateExceptionRef.current = onUpdateExceptionItemsAndAlertStatus;
    return (): void => {
      setIsLoading(false);
      abortCtrl.abort();
    };
  }, [updateExceptionListItem, http]);

  return [isLoading, addOrUpdateExceptionRef.current];
};
