/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchExceptionListById, fetchExceptionListItemsByListId } from '../api';
import {
  ExceptionItemsAndPagination,
  UseExceptionListProps,
  UseExceptionListRefreshProps,
} from '../types';
import { ExceptionListSchema } from '../../../common/schemas';

type Func = (arg: UseExceptionListRefreshProps) => void;
export type ReturnExceptionListAndItems = [
  boolean,
  ExceptionListSchema | null,
  ExceptionItemsAndPagination | null,
  Func | null
];

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
  const [exceptionList, setExceptionList] = useState<ExceptionListSchema | null>(null);
  const [exceptionItems, setExceptionListItems] = useState<ExceptionItemsAndPagination | null>(
    null
  );
  const fetchExceptionList = useRef<Func | null>(null);
  const [loading, setLoading] = useState(true);
  const tags = useMemo(() => filterOptions.tags.sort().join(), [filterOptions.tags]);

  useEffect(
    () => {
      let isSubscribed = true;
      const abortCtrl = new AbortController();

      const fetchData = async ({
        listId,
        listNamespaceType,
      }: UseExceptionListRefreshProps): Promise<void> => {
        try {
          setLoading(true);

          const { list_id, namespace_type, ...restOfExceptionList } = await fetchExceptionListById({
            http,
            id: listId,
            namespaceType: listNamespaceType,
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

          if (isSubscribed) {
            setExceptionList({
              list_id,
              namespace_type,
              ...restOfExceptionList,
            });
            setExceptionListItems({
              items: [...fetchListItemsResult.data],
              pagination: {
                page: fetchListItemsResult.page,
                perPage: fetchListItemsResult.per_page,
                total: fetchListItemsResult.total,
              },
            });
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

      if (id != null && namespaceType != null) {
        fetchData({ listId: id, listNamespaceType: namespaceType });
      }

      fetchExceptionList.current = fetchData;
      return (): void => {
        isSubscribed = false;
        abortCtrl.abort();
      };
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [http, id, namespaceType, pagination.page, pagination.perPage, filterOptions.filter, tags]
  );

  return [loading, exceptionList, exceptionItems, fetchExceptionList.current];
};
