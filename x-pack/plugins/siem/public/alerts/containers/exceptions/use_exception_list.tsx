/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { errorToToaster, useStateToaster } from '../../../common/components/toasters';
import { fetchExceptionListById, fetchExceptionListItemsByListId } from './api';
import * as i18n from './translations';
import { ExceptionListAndItems } from './types';

export type ReturnExceptionListAndItems = [boolean, ExceptionListAndItems | null];

/**
 * Hook for using to get an ExceptionList and it's items
 *
 * @param id desired ExceptionList ID (not list_id)
 *
 */
export const useExceptionList = (id: string | undefined): ReturnExceptionListAndItems => {
  const [exceptionListAndItems, setExceptionList] = useState<ExceptionListAndItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchData(idToFetch: string) {
      try {
        setLoading(true);
        const exceptionList = await fetchExceptionListById({
          id: idToFetch,
          signal: abortCtrl.signal,
        });
        const exceptionListItems = await fetchExceptionListItemsByListId({
          listId: exceptionList.list_id,
          signal: abortCtrl.signal,
        });
        if (isSubscribed) {
          setExceptionList({ ...exceptionList, exceptionItems: { ...exceptionListItems } });
        }
      } catch (error) {
        if (isSubscribed) {
          setExceptionList(null);
          errorToToaster({ title: i18n.EXCEPTION_LIST_FETCH_FAILURE, error, dispatchToaster });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }
    if (id != null) {
      fetchData(id);
    }
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [id]);

  return [loading, exceptionListAndItems];
};
