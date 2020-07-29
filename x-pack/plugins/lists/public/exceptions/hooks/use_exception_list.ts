/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchExceptionListsItemsByListIds } from '../api';
import { Pagination, UseExceptionListProps } from '../types';
import { ExceptionListItemSchema, NamespaceType } from '../../../common/schemas';

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
 * @param showDetectionsListsOnly boolean, if true, only detection lists are searched
 * @param showEndpointListsOnly boolean, if true, only endpoint lists are searched
 * @param matchFilters boolean, if true, applies first filter in filterOptions to
 * all lists
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
  showDetectionsListsOnly = false,
  showEndpointListsOnly = false,
  matchFilters = false,
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
      let isSubscribed = true;
      const abortCtrl = new AbortController();

      const fetchData = async (): Promise<void> => {
        const { ids, namespaces } = lists
          .filter((list) => {
            if (showDetectionsListsOnly) {
              return list.type === 'detection';
            } else if (showEndpointListsOnly) {
              return list.type === 'endpoint';
            } else {
              return true;
            }
          })
          .reduce<{ ids: string[]; namespaces: NamespaceType[] }>(
            (acc, { listId, namespaceType }) => ({
              ids: [...acc.ids, listId],
              namespaces: [...acc.namespaces, namespaceType],
            }),
            { ids: [], namespaces: [] }
          );
        const filter =
          matchFilters && filterOptions.length > 0
            ? ids.map(() => filterOptions[0])
            : filterOptions;
        try {
          if (ids.length > 0 && namespaces.length > 0) {
            setLoading(true);

            const {
              data,
              page,
              per_page: perPage,
              total,
            } = await fetchExceptionListsItemsByListIds({
              filterOptions: filter,
              http,
              listIds: ids,
              namespaceTypes: namespaces,
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
              setLoading(false);
            }
          } else {
            if (isSubscribed) {
              setLoading(false);
            }
          }
        } catch (error) {
          if (isSubscribed) {
            setLoading(false);
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

      fetchData();

      fetchExceptionListItems.current = fetchData;
      return (): void => {
        isSubscribed = false;
        abortCtrl.abort();
      };
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      http,
      listIds,
      setExceptionListItems,
      pagination.page,
      pagination.perPage,
      filters,
      filterTags,
      showDetectionsListsOnly,
      showEndpointListsOnly,
    ]
  );

  return [loading, exceptionItems, paginationInfo, fetchExceptionListItems.current];
};
