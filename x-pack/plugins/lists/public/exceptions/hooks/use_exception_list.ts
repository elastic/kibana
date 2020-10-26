/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useRef, useState } from 'react';

import { fetchExceptionListsItemsByListIds } from '../api';
import { FilterExceptionsOptions, Pagination, UseExceptionListProps } from '../types';
import { ExceptionListItemSchema } from '../../../common/schemas';
import { getIdsAndNamespaces } from '../utils';

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
 * @param lists array of ExceptionListIdentifiers for all lists to fetch
 * @param onError error callback
 * @param onSuccess callback when all lists fetched successfully
 * @param filterOptions optional - filter by fields or tags
 * @param showDetectionsListsOnly boolean, if true, only detection lists are searched
 * @param showEndpointListsOnly boolean, if true, only endpoint lists are searched
 * @param matchFilters boolean, if true, applies first filter in filterOptions to
 * all lists
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
  filterOptions,
  showDetectionsListsOnly,
  showEndpointListsOnly,
  matchFilters,
  onError,
  onSuccess,
}: UseExceptionListProps): ReturnExceptionListAndItems => {
  const [exceptionItems, setExceptionListItems] = useState<ExceptionListItemSchema[]>([]);
  const [paginationInfo, setPagination] = useState<Pagination>(pagination);
  const fetchExceptionListsItems = useRef<Func | null>(null);
  const [loading, setLoading] = useState(true);
  const { ids, namespaces } = getIdsAndNamespaces({
    lists,
    showDetection: showDetectionsListsOnly,
    showEndpoint: showEndpointListsOnly,
  });
  const filters: FilterExceptionsOptions[] =
    matchFilters && filterOptions.length > 0 ? ids.map(() => filterOptions[0]) : filterOptions;
  const idsAsString: string = ids.join(',');
  const namespacesAsString: string = namespaces.join(',');
  const filterAsString: string = filterOptions.map(({ filter }) => filter).join(',');
  const filterTagsAsString: string = filterOptions.map(({ tags }) => tags.join(',')).join(',');

  useEffect(
    () => {
      let isSubscribed = true;
      const abortCtrl = new AbortController();

      const fetchData = async (): Promise<void> => {
        try {
          setLoading(true);

          if (ids.length === 0 && isSubscribed) {
            setPagination({
              page: 0,
              perPage: pagination.perPage,
              total: 0,
            });
            setExceptionListItems([]);

            if (onSuccess != null) {
              onSuccess({
                exceptions: [],
                pagination: {
                  page: 0,
                  perPage: pagination.perPage,
                  total: 0,
                },
              });
            }
            setLoading(false);
          } else {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { page, per_page, total, data } = await fetchExceptionListsItemsByListIds({
              filterOptions: filters,
              http,
              listIds: ids,
              namespaceTypes: namespaces,
              pagination: {
                page: pagination.page,
                perPage: pagination.perPage,
              },
              signal: abortCtrl.signal,
            });

            if (isSubscribed) {
              setPagination({
                page,
                perPage: per_page,
                total,
              });
              setExceptionListItems(data);

              if (onSuccess != null) {
                onSuccess({
                  exceptions: data,
                  pagination: {
                    page,
                    perPage: per_page,
                    total,
                  },
                });
              }
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

        if (isSubscribed) {
          setLoading(false);
        }
      };

      fetchData();

      fetchExceptionListsItems.current = fetchData;
      return (): void => {
        isSubscribed = false;
        abortCtrl.abort();
      };
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      http,
      idsAsString,
      namespacesAsString,
      setExceptionListItems,
      pagination.page,
      pagination.perPage,
      filterAsString,
      filterTagsAsString,
    ]
  );

  return [loading, exceptionItems, paginationInfo, fetchExceptionListsItems.current];
};
