/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Dispatch, useEffect, useState } from 'react';

import { UpdateExceptionListItemSchema } from '../../../common/schemas';
import { addExceptionListItem, updateExceptionListItem } from '../api';
import { AddExceptionListItem, PersistHookProps } from '../types';

interface PersistReturnExceptionItem {
  isLoading: boolean;
  isSaved: boolean;
}

export type ReturnPersistExceptionItem = [
  PersistReturnExceptionItem,
  Dispatch<AddExceptionListItem | null>
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
  const [exceptionListItem, setExceptionItem] = useState<AddExceptionListItem | null>(null);
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
            await updateExceptionListItem({
              http,
              listItem: exceptionListItem,
              signal: abortCtrl.signal,
            });
          } else {
            await addExceptionListItem({
              http,
              listItem: exceptionListItem,
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
