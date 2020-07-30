/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchExceptionListById, fetchExceptionListItemsByListId } from '../api';
import { ExceptionIdentifiers, ExceptionList, Pagination, UseExceptionListProps } from '../types';
import { ExceptionListItemSchema, NamespaceType } from '../../../common/schemas';

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
  filterOptions = {
    filter: '',
    tags: [],
  },
  onError,
  onSuccess,
}: UseExceptionListProps): ReturnExceptionListAndItems => {
  const [exceptionLists, setExceptionLists] = useState<ExceptionList[]>([]);
  const [exceptionItems, setExceptionListItems] = useState<ExceptionListItemSchema[]>([]);
  const [paginationInfo, setPagination] = useState<Pagination>(pagination);
  const fetchExceptionList = useRef<Func | null>(null);
  const [loading, setLoading] = useState(true);
  const tags = useMemo(() => filterOptions.tags.sort().join(), [filterOptions.tags]);
  const listIds = useMemo(
    () =>
      lists
        .map((t) => t.id)
        .sort()
        .join(),
    [lists]
  );

  useEffect(
    () => {
      let isSubscribed = false;
      let abortCtrl: AbortController;

      const fetchLists = async (): Promise<void> => {
        isSubscribed = true;
        abortCtrl = new AbortController();

        // TODO: workaround until api updated, will be cleaned up
        let exceptions: ExceptionListItemSchema[] = [];
        let exceptionListsReturned: ExceptionList[] = [];

        const fetchData = async ({
          id,
          namespaceType,
        }: {
          id: string;
          namespaceType: NamespaceType;
        }): Promise<void> => {
          try {
            setLoading(true);

            const {
              list_id,
              namespace_type,
              ...restOfExceptionList
            } = await fetchExceptionListById({
              http,
              id,
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

            if (isSubscribed) {
              exceptionListsReturned = [
                ...exceptionListsReturned,
                {
                  list_id,
                  namespace_type,
                  ...restOfExceptionList,
                  totalItems: fetchListItemsResult.total,
                },
              ];
              setExceptionLists(exceptionListsReturned);
              setPagination({
                page: fetchListItemsResult.page,
                perPage: fetchListItemsResult.per_page,
                total: fetchListItemsResult.total,
              });

              exceptions = [...exceptions, ...fetchListItemsResult.data];
              setExceptionListItems(exceptions);

              if (onSuccess != null) {
                onSuccess({
                  exceptions,
                  lists: exceptionListsReturned,
                  pagination: {
                    page: fetchListItemsResult.page,
                    perPage: fetchListItemsResult.per_page,
                    total: fetchListItemsResult.total,
                  },
                });
              }
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
              if (onError != null) {
                onError(error);
              }
            }
          }
        };

        // TODO: Workaround for now. Once api updated, we can pass in array of lists to fetch
        await Promise.all(
          lists.map(
            ({ id, namespaceType }: ExceptionIdentifiers): Promise<void> =>
              fetchData({ id, namespaceType })
          )
        );

        if (isSubscribed) {
          setLoading(false);
        }
      };

      fetchLists();

      fetchExceptionList.current = fetchLists;
      return (): void => {
        isSubscribed = false;
        abortCtrl.abort();
      };
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      http,
      listIds,
      setExceptionLists,
      setExceptionListItems,
      pagination.page,
      pagination.perPage,
      filterOptions.filter,
      tags,
    ]
  );

  return [loading, exceptionLists, exceptionItems, paginationInfo, fetchExceptionList.current];
};
