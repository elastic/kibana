/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useRef, useState } from 'react';

import { fetchExceptionLists } from '../api';
import { Pagination, UseExceptionListsProps } from '../types';
import { ExceptionListSchema } from '../../../common/schemas';

export type ReturnExceptionLists = [boolean, ExceptionListSchema[], Pagination, () => void | null];

/**
 * Hook for fetching ExceptionLists
 *
 * @param http Kibana http service
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
export const useExceptionLists = ({
  http,
  pagination = {
    page: 1,
    perPage: 20,
    total: 0,
  },
  filterOptions = [],
  onError,
  onSuccess,
}: UseExceptionListsProps): ReturnExceptionLists => {
  const [exceptionLists, setExceptionLists] = useState<ExceptionListSchema[]>([]);
  const [paginationInfo, setPagination] = useState<Pagination>(pagination);
  const fetchExceptionListsRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const filterAsString: string = filterOptions.map(({ filter }) => filter).join(',');
  const filterTagsAsString: string = filterOptions.map(({ tags }) => tags.join(',')).join(',');

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true);

        const { page, per_page: perPage, total, data } = await fetchExceptionLists({
          http,
          namespaceType: 'single',
          pagination: {
            page: pagination.page,
            perPage: pagination.perPage,
          },
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setPagination({
            page,
            perPage,
            total,
          });
          setExceptionLists(data);

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
          setExceptionLists([]);
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

    fetchExceptionListsRef.current = fetchData;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [
    http,
    setExceptionLists,
    pagination.page,
    pagination.perPage,
    filterAsString,
    filterTagsAsString,
    onError,
    onSuccess,
  ]);

  return [loading, exceptionLists, paginationInfo, fetchExceptionListsRef.current];
};
