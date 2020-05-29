/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, useEffect, useState } from 'react';

import { addExceptionListItem as persistExceptionItem } from '../api';
import { AddExceptionListItem, PersistHookProps } from '../types';

interface PersistReturnExceptionItem {
  isLoading: boolean;
  isSaved: boolean;
}

export type ReturnPersistExceptionItem = [
  PersistReturnExceptionItem,
  Dispatch<AddExceptionListItem | null>
];

export const usePersistExceptionItem = ({
  http,
  onError,
}: PersistHookProps): ReturnPersistExceptionItem => {
  const [exceptionListItem, setExceptionItem] = useState<AddExceptionListItem | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setIsSaved(false);

    const saveExceptionItem = async (): Promise<void> => {
      if (exceptionListItem != null) {
        try {
          setIsLoading(true);
          await persistExceptionItem({
            http,
            listItem: exceptionListItem,
            signal: abortCtrl.signal,
          });
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
