/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, useEffect, useState } from 'react';

import {
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '../../../common/schemas';
import { addExceptionListItem, updateExceptionListItem } from '../api';
import { transformNewItemOutput, transformOutput } from '../transforms';
import { PersistHookProps } from '../types';

interface PersistReturnExceptionItem {
  isLoading: boolean;
  isSaved: boolean;
}

export type ReturnPersistExceptionItem = [
  PersistReturnExceptionItem,
  Dispatch<CreateExceptionListItemSchema | UpdateExceptionListItemSchema | null>
];

/**
 * Hook for creating or updating ExceptionListItem
 *
 * @param http Kibana http service
 * @param onError error callback
 *
 */
export const usePersistExceptionItem = ({
  http,
  onError,
}: PersistHookProps): ReturnPersistExceptionItem => {
  const [exceptionListItem, setExceptionItem] = useState<
    CreateExceptionListItemSchema | UpdateExceptionListItemSchema | null
  >(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isUpdateExceptionItem = (item: unknown): item is UpdateExceptionListItemSchema =>
    Boolean(item && (item as UpdateExceptionListItemSchema).id != null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setIsSaved(false);

    const saveExceptionItem = async (): Promise<void> => {
      if (exceptionListItem != null) {
        try {
          setIsLoading(true);

          if (isUpdateExceptionItem(exceptionListItem)) {
            // Please see `x-pack/plugins/lists/public/exceptions/transforms.ts` doc notes
            // for context around the temporary `id`
            const transformedList = transformOutput(exceptionListItem);

            await updateExceptionListItem({
              http,
              listItem: transformedList,
              signal: abortCtrl.signal,
            });
          } else {
            // Please see `x-pack/plugins/lists/public/exceptions/transforms.ts` doc notes
            // for context around the temporary `id`
            const transformedList = transformNewItemOutput(exceptionListItem);

            await addExceptionListItem({
              http,
              listItem: transformedList,
              signal: abortCtrl.signal,
            });
          }

          if (isSubscribed) {
            setIsSaved(true);
          }
        } catch (error) {
          if (isSubscribed) {
            onError(error);
          }
        }
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    saveExceptionItem();
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, exceptionListItem, onError]);

  return [{ isLoading, isSaved }, setExceptionItem];
};
