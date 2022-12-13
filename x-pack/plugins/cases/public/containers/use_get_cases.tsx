/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { casesQueriesKeys, DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from './constants';
import type { Cases, FilterOptions, QueryParams } from './types';
import { SortFieldCase, StatusAll, SeverityAll } from './types';
import { useToasts } from '../common/lib/kibana';
import * as i18n from './translations';
import { getCases } from './api';
import type { ServerError } from '../types';

const DEFAULT_SEARCH_FIELDS = ['title', 'description'];

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  search: '',
  searchFields: DEFAULT_SEARCH_FIELDS,
  severity: SeverityAll,
  assignees: [],
  reporters: [],
  status: StatusAll,
  tags: [],
  owner: [],
};

export const DEFAULT_QUERY_PARAMS: QueryParams = {
  page: DEFAULT_TABLE_ACTIVE_PAGE,
  perPage: DEFAULT_TABLE_LIMIT,
  sortField: SortFieldCase.createdAt,
  sortOrder: 'desc',
};

export const initialData: Cases = {
  cases: [],
  countClosedCases: 0,
  countInProgressCases: 0,
  countOpenCases: 0,
  page: 0,
  perPage: 0,
  total: 0,
};

export const useGetCases = (
  params: {
    queryParams?: Partial<QueryParams>;
    filterOptions?: Partial<FilterOptions>;
  } = {}
): UseQueryResult<Cases> => {
  const toasts = useToasts();
  return useQuery(
    casesQueriesKeys.cases(params),
    () => {
      const abortCtrl = new AbortController();
      return getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          ...(params.filterOptions ?? {}),
        },
        queryParams: {
          ...DEFAULT_QUERY_PARAMS,
          ...(params.queryParams ?? {}),
        },
        signal: abortCtrl.signal,
      });
    },
    {
      keepPreviousData: true,
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
        }
      },
    }
  );
};
