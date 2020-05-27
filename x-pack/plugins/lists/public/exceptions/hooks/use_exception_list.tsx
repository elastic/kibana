/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { fetchExceptionListById, fetchExceptionListItemsByListId } from '../api';
import { ExceptionListAndItems, UseExceptionListProps } from '../types';

export type ReturnExceptionListAndItems = [boolean, ExceptionListAndItems | null];

/**
 * Hook for using to get an ExceptionList and it's ExceptionListItems
 *
 * @param id desired ExceptionList ID (not list_id)
 *
 */
export const useExceptionList = ({
  http,
  id,
  onError,
}: UseExceptionListProps): ReturnExceptionListAndItems => {
  const [exceptionListAndItems, setExceptionList] = useState<ExceptionListAndItems | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (idToFetch: string): Promise<void> => {
      try {
        setLoading(true);
        const exceptionList = await fetchExceptionListById({
          http,
          id: idToFetch,
          signal: abortCtrl.signal,
        });
        const exceptionListItems = await fetchExceptionListItemsByListId({
          http,
          listId: exceptionList.list_id,
          signal: abortCtrl.signal,
        });
        if (isSubscribed) {
          setExceptionList({ ...exceptionList, exceptionItems: { ...exceptionListItems } });
        }
      } catch (error) {
        if (isSubscribed) {
          setExceptionList(null);
          onError(error);
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    if (id != null) {
      fetchData(id);
    }
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, id, onError]);

  return [loading, exceptionListAndItems];
};
