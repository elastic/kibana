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

export interface UseCreateOrUpdateExceptionProps {
  items: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
}

export type CreateOrUpdateExceptionItemsFunc = (
  args: UseCreateOrUpdateExceptionProps
) => Promise<ExceptionListItemSchema[]>;

export type ReturnUseCreateOrUpdateException = [boolean, CreateOrUpdateExceptionItemsFunc | null];

/**
 * Hook for adding and/or updating an exception item
 */
export const useCreateOrUpdateException = (): ReturnUseCreateOrUpdateException => {
  const {
    services: { http },
  } = useKibana();
  const [isLoading, setIsLoading] = useState(false);
  const addOrUpdateExceptionRef = useRef<CreateOrUpdateExceptionItemsFunc | null>(null);
  const { updateExceptionListItem } = useApi(http);

  useEffect(() => {
    const abortCtrl = new AbortController();

    const onUpdateExceptionItemsAndAlertStatus: CreateOrUpdateExceptionItemsFunc = async ({
      items,
    }) => {
      setIsLoading(true);
      const itemsAdded = await Promise.all(
        items.map((item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
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
        })
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
