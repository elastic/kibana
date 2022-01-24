/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { parse, stringify } from 'query-string';

export const PAGE_SIZE_OPTIONS: readonly number[] = [5, 20, 50];

export interface Pagination {
  currentPage: number;
  pageSize: number;
}

/**
 * Parses `search` params and returns an object with them along with a `toUrlParams` function
 * that allows being able to retrieve a stringified version of an object (default is the
 * `urlParams` that was parsed) for use in the url.
 * Object will be recreated every time `search` changes.
 */
export function useUrlParams() {
  const { search } = useLocation();
  const [urlParams, setUrlParams] = useState(() => parse(search));
  const toUrlParams = useCallback((params = urlParams) => stringify(params), [urlParams]);
  useEffect(() => {
    setUrlParams(parse(search));
  }, [search]);
  return {
    urlParams,
    toUrlParams,
  };
}

export function usePagination(
  pageInfo: Pagination = {
    currentPage: 1,
    pageSize: 20,
  }
) {
  const [pagination, setPagination] = useState<Pagination>(pageInfo);
  const pageSizeOptions = useMemo(() => [...PAGE_SIZE_OPTIONS], []);

  return {
    pagination,
    setPagination,
    pageSizeOptions,
  };
}
type SetUrlPagination = (pagination: Pagination) => void;
interface UrlPagination {
  pagination: Pagination;
  setPagination: SetUrlPagination;
  pageSizeOptions: number[];
}

type UrlPaginationParams = Partial<Pagination>;

/**
 * Uses URL params for pagination and also persists those to the URL as they are updated
 */
export const useUrlPagination = (): UrlPagination => {
  const location = useLocation();
  const history = useHistory();
  const { urlParams, toUrlParams } = useUrlParams();
  const urlPaginationParams = useMemo(() => {
    return paginationFromUrlParams(urlParams);
  }, [urlParams]);
  const { pagination, pageSizeOptions, setPagination } = usePagination(urlPaginationParams);

  const setUrlPagination = useCallback<SetUrlPagination>(
    ({ pageSize, currentPage }) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          currentPage,
          pageSize,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  useEffect(() => {
    setPagination((prevState) => {
      return {
        ...prevState,
        ...paginationFromUrlParams(urlParams),
      };
    });
  }, [setPagination, urlParams]);

  return {
    pagination,
    setPagination: setUrlPagination,
    pageSizeOptions,
  };
};

const paginationFromUrlParams = (urlParams: UrlPaginationParams): Pagination => {
  const pagination: Pagination = {
    pageSize: 20,
    currentPage: 1,
  };

  // Search params can appear multiple times in the URL, in which case the value for them,
  // once parsed, would be an array. In these case, we take the last value defined
  pagination.currentPage = Number(
    (Array.isArray(urlParams.currentPage) ? urlParams.currentPage.pop() : urlParams.currentPage) ??
      pagination.currentPage
  );
  pagination.pageSize =
    Number(
      (Array.isArray(urlParams.pageSize) ? urlParams.pageSize.pop() : urlParams.pageSize) ??
        pagination.pageSize
    ) ?? pagination.pageSize;

  // If Current Page is not a valid positive integer, set it to 1
  if (!Number.isFinite(pagination.currentPage) || pagination.currentPage < 1) {
    pagination.currentPage = 1;
  }

  // if pageSize is not one of the expected page sizes, reset it to 20 (default)
  if (!PAGE_SIZE_OPTIONS.includes(pagination.pageSize)) {
    pagination.pageSize = 20;
  }

  return pagination;
};
