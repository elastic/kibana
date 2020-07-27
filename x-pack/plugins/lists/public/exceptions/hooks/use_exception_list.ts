/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchExceptionListItemsByListId } from '../api';
import { ExceptionList, Pagination, UseExceptionListProps } from '../types';
import { ExceptionListItemSchema } from '../../../common/schemas';

type Func = () => void;
export type ReturnExceptionListAndItems = [
  boolean,
  ExceptionList[],
  ExceptionListItemSchema[],
  Pagination,
  Func | null
];

/**
 * Hook for using to get an ExceptionList and it's ExceptionListItems
 *
 * @param http Kibana http service
 * @param lists array of ExceptionIdentifiers for all lists to fetch
 * @param onError error callback
 * @param onSuccess callback when all lists fetched successfully
 * @param filterOptions optional - filter by fields or tags
 * @param pagination optional
 *
 */
export const useExceptionList = ({
  http,
  lists,
  pagination = {
    page: 1,
    perPage: 20,
    total: 0,
  },
  filterOptions = [],
  onError,
  onSuccess,
}: UseExceptionListProps): ReturnExceptionListAndItems => {
  const [exceptionLists, setExceptionLists] = useState<ExceptionList[]>([]);
  const [exceptionItems, setExceptionListItems] = useState<ExceptionListItemSchema[]>([]);
  const [paginationInfo, setPagination] = useState<Pagination>(pagination);
  const fetchExceptionList = useRef<Func | null>(null);
  const [loading, setLoading] = useState(false);
  const listIds = useMemo((): string => lists.map(({ id }) => id).join(','), [lists]);
  const namespaceTypes = useMemo(
    (): string => lists.map(({ namespaceType }) => namespaceType).join(','),
    [lists]
  );
  const listFilters = useMemo(
    (): string =>
      filterOptions
        .map((filter, index) => {
          const namespaces = namespaceTypes.split(',');
          const namespace = namespaces[index];
          const listFilter = [
            ...(filter.filter.length
              ? [`${namespace}.attributes.entries.field:${filter.filter}*`]
              : []),
            ...(filter.tags.length
              ? filter.tags.map((t) => `${namespace}.attributes.tags:${t}`)
              : []),
          ];

          return listFilter.join(' AND ');
        })
        .join(','),
    [filterOptions, namespaceTypes]
  );

  useEffect(
    () => {
      let isSubscribed = false;
      const abortCtrl = new AbortController();
      const fetchData = async (): Promise<void> => {
        try {
          setLoading(true);

          const fetchListItemsResult = await fetchExceptionListItemsByListId({
            filterOptions: listFilters,
            http,
            listIds,
            namespaceTypes,
            pagination,
            signal: abortCtrl.signal,
          });

          if (isSubscribed) {
            setPagination({
              page: fetchListItemsResult.page,
              perPage: fetchListItemsResult.per_page,
              total: fetchListItemsResult.total,
            });
            setExceptionListItems(fetchListItemsResult.data);

            if (onSuccess != null) {
              onSuccess({
                exceptions: exceptionItems,
                pagination: {
                  page: fetchListItemsResult.page,
                  perPage: fetchListItemsResult.per_page,
                  total: fetchListItemsResult.total,
                },
              });
            }

            setLoading(false);
          }
        } catch (error) {
          if (isSubscribed) {
            setExceptionLists([]);
            setExceptionListItems([]);
            setPagination({
              page: 1,
              perPage: 20,
              total: 0,
            });
            setLoading(false);
            if (onError != null) {
              onError(error);
            }
          }
        }
      };

      if (listIds !== '' && namespaceTypes !== '') {
        fetchData();
      }

      fetchExceptionList.current = fetchData;
      return (): void => {
        isSubscribed = false;
        abortCtrl.abort();
      };
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      http,
      listIds,
      namespaceTypes,
      setExceptionLists,
      setExceptionListItems,
      pagination.page,
      pagination.perPage,
      listFilters,
    ]
  );

  return [loading, exceptionLists, exceptionItems, paginationInfo, fetchExceptionList.current];
};
