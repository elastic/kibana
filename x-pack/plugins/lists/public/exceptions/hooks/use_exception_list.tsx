/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';

import { fetchExceptionListById, fetchExceptionListItemsByListId } from '../api';
import { ExceptionListAndItems, UseExceptionListProps } from '../types';

export type ReturnExceptionListAndItems = [boolean, ExceptionListAndItems | null, () => void];

/**
 * Hook for using to get an ExceptionList and it's ExceptionListItems
 *
 * @param http Kibana http service
 * @param id desired ExceptionList ID (not list_id)
 * @param namespaceType list namespaceType determines list space
 * @param onError error callback
 * @param filterOptions optional - filter by fields or tags
 * @param pagination optional
 *
 */
export const useExceptionList = ({
  http,
  id,
  namespaceType,
  pagination = {
    page: 1,
    perPage: 20,
    total: 0,
  },
  filterOptions = {
    filter: '',
    tags: [],
  },
  onError,
}: UseExceptionListProps): ReturnExceptionListAndItems => {
  const [exceptionListAndItems, setExceptionList] = useState<ExceptionListAndItems | null>(null);
  const [shouldRefresh, setRefresh] = useState<boolean>(true);
  const refreshExceptionList = useCallback(() => setRefresh(true), [setRefresh]);
  const [loading, setLoading] = useState(true);
  const tags = filterOptions.tags.sort().join();

  useEffect(
    () => {
      let isSubscribed = true;
      const abortCtrl = new AbortController();

      const fetchData = async (idToFetch: string): Promise<void> => {
        if (shouldRefresh) {
          try {
            setLoading(true);

            const {
              list_id,
              namespace_type,
              ...restOfExceptionList
            } = await fetchExceptionListById({
              http,
              id: idToFetch,
              namespaceType,
              signal: abortCtrl.signal,
            });
            const fetchListItemsResult = await fetchExceptionListItemsByListId({
              filterOptions,
              http,
              listId: list_id,
              namespaceType: namespace_type,
              pagination,
              signal: abortCtrl.signal,
            });

            setRefresh(false);

            if (isSubscribed) {
              setExceptionList({
                list_id,
                namespace_type,
                ...restOfExceptionList,
                exceptionItems: {
                  items: [...fetchListItemsResult.data],
                  pagination: {
                    page: fetchListItemsResult.page,
                    perPage: fetchListItemsResult.per_page,
                    total: fetchListItemsResult.total,
                  },
                },
              });
            }
          } catch (error) {
            setRefresh(false);
            if (isSubscribed) {
              setExceptionList(null);
              onError(error);
            }
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
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      http,
      id,
      onError,
      shouldRefresh,
      pagination.page,
      pagination.perPage,
      filterOptions.filter,
      tags,
    ]
  );

  return [loading, exceptionListAndItems, refreshExceptionList];
};
