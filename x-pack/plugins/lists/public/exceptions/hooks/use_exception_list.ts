/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchExceptionListsItemsByListIds } from '../api';
import { Pagination, UseExceptionListProps } from '../types';
import { ExceptionListItemSchema } from '../../../common/schemas';

type Func = () => void;
export type ReturnExceptionListAndItems = [
  boolean,
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
  const [exceptionItems, setExceptionListItems] = useState<ExceptionListItemSchema[]>([]);
  const [paginationInfo, setPagination] = useState<Pagination>(pagination);
  const fetchExceptionListItems = useRef<Func | null>(null);
  const [loading, setLoading] = useState(true);
  const listIds = useMemo(
    () =>
      lists
        .map(({ listId }) => listId)
        .sort()
        .join(),
    [lists]
  );
  const filters = useMemo(
    () =>
      filterOptions
        .map(({ filter }) => filter)
        .sort()
        .join(),
    [filterOptions]
  );
  const filterTags = useMemo(
    () =>
      filterOptions
        .map(({ tags }) => tags)
        .sort()
        .join(),
    [filterOptions]
  );

  useEffect(
    () => {
      let isSubscribed = false;
      const abortCtrl = new AbortController();
      const fetchData = async (): Promise<void> => {
        try {
          setLoading(true);

          const { data, page, per_page: perPage, total } = await fetchExceptionListsItemsByListIds({
            filterOptions,
            http,
            listIds: lists.map(({ listId }) => listId),
            namespaceTypes: lists.map(({ namespaceType }) => namespaceType),
            pagination,
            signal: abortCtrl.signal,
          });

          if (isSubscribed) {
            setPagination({
              page,
              perPage,
              total,
            });
            setExceptionListItems(data);

            if (onSuccess != null) {
              onSuccess({
                exceptions: data,
                pagination: {
                  page,
                  perPage,
                  total,
                },
              });
            }
          }
        } catch (error) {
          if (isSubscribed) {
            setExceptionListItems([]);
            setPagination({
              page: 1,
              perPage: 20,
              total: 0,
            });
            if (onError != null) {
              onError(error);
            }
          }
        }
      };

      if (lists.length > 0) {
        fetchData();
      }

      fetchExceptionListItems.current = fetchData;
      return (): void => {
        isSubscribed = false;
        abortCtrl.abort();
      };
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [http, listIds, setExceptionListItems, pagination.page, pagination.perPage, filters, filterTags]
  );

  return [loading, exceptionItems, paginationInfo, fetchExceptionListItems.current];
};
