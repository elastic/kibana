/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { MANAGEMENT_DEFAULT_PAGE_SIZE, MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../common/constants';
import { useUrlParams } from './use_url_params';

// Page is not index-based, it is 1-based
interface Pagination {
  page: number;
  pageSize: number;
}

type SetUrlPagination = (pagination: Pagination) => void;
interface UrlPagination {
  pagination: Pagination;
  setPagination: SetUrlPagination;
  pageSizeOptions: number[];
}

type UrlPaginationParams = Partial<Pagination>;

export const paginationFromUrlParams = (urlParams: UrlPaginationParams): Pagination => {
  const pagination: Pagination = {
    pageSize: MANAGEMENT_DEFAULT_PAGE_SIZE,
    page: 1,
  };

  // Search params can appear multiple times in the URL, in which case the value for them,
  // once parsed, would be an array. In these case, we take the last value defined
  pagination.page = Number(
    (Array.isArray(urlParams.page) ? urlParams.page[urlParams.page.length - 1] : urlParams.page) ??
      pagination.page
  );
  pagination.pageSize =
    Number(
      (Array.isArray(urlParams.pageSize)
        ? urlParams.pageSize[urlParams.pageSize.length - 1]
        : urlParams.pageSize) ?? pagination.pageSize
    ) ?? pagination.pageSize;

  // If Current Page is not a valid positive integer, set it to 1
  if (!Number.isFinite(pagination.page) || pagination.page < 1) {
    pagination.page = 1;
  }

  // if pageSize is not one of the expected page sizes, reset it to 10 (default)
  if (!MANAGEMENT_PAGE_SIZE_OPTIONS.includes(pagination.pageSize)) {
    pagination.pageSize = MANAGEMENT_DEFAULT_PAGE_SIZE;
  }

  return pagination;
};

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
  const [pagination, setPagination] = useState<Pagination>(urlPaginationParams);
  const setUrlPagination = useCallback<SetUrlPagination>(
    ({ pageSize, page }) => {
      history.push({
        ...location,
        search: toUrlParams({
          ...urlParams,
          page,
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
    pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
  };
};
