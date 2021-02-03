/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { fetchExceptionLists } from '../api';
import { Pagination, UseExceptionListsProps } from '../types';
import { ExceptionListSchema } from '../../../common/schemas';
import { getFilters } from '../utils';

export type Func = () => void;
export type ReturnExceptionLists = [boolean, ExceptionListSchema[], Pagination, Func | null];

/**
 * Hook for fetching ExceptionLists
 *
 * @param http Kibana http service
 * @param errorMessage message shown to user if error occurs
 * @param filterOptions filter by certain fields
 * @param namespaceTypes spaces to be searched
 * @param notifications kibana service for displaying toasters
 * @param showTrustedApps boolean - include/exclude trusted app lists
 * @param pagination
 *
 */
export const useExceptionLists = ({
  errorMessage,
  http,
  pagination = {
    page: 1,
    perPage: 20,
    total: 0,
  },
  filterOptions = {},
  namespaceTypes,
  notifications,
  showTrustedApps = false,
}: UseExceptionListsProps): ReturnExceptionLists => {
  const [exceptionLists, setExceptionLists] = useState<ExceptionListSchema[]>([]);
  const [paginationInfo, setPagination] = useState<Pagination>(pagination);
  const [loading, setLoading] = useState(true);
  const fetchExceptionListsRef = useRef<Func | null>(null);

  const namespaceTypesAsString = useMemo(() => namespaceTypes.join(','), [namespaceTypes]);
  const filters = useMemo(
    (): string => getFilters(filterOptions, namespaceTypes, showTrustedApps),
    [namespaceTypes, filterOptions, showTrustedApps]
  );

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true);

        const { page, per_page: perPage, total, data } = await fetchExceptionLists({
          filters,
          http,
          namespaceTypes: namespaceTypesAsString,
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
          setLoading(false);
        }
      } catch (error) {
        if (isSubscribed) {
          notifications.toasts.addError(error, {
            title: errorMessage,
          });
          setExceptionLists([]);
          setPagination({
            page: 1,
            perPage: 20,
            total: 0,
          });
          setLoading(false);
        }
      }
    };

    fetchData();

    fetchExceptionListsRef.current = fetchData;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [
    errorMessage,
    notifications,
    pagination.page,
    pagination.perPage,
    filters,
    namespaceTypesAsString,
    http,
  ]);

  return [loading, exceptionLists, paginationInfo, fetchExceptionListsRef.current];
};
