/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { buildEsQuery, EsQueryConfig } from '@kbn/es-query';
import type { EuiBasicTableProps, Pagination } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type Query } from '@kbn/es-query';
import { useKibana } from '../use_kibana';
import type {
  FindingsBaseESQueryConfig,
  FindingsBaseProps,
  FindingsBaseURLQuery,
} from '../../types';

const getBaseQuery = ({
  dataView,
  query,
  filters,
  config,
}: FindingsBaseURLQuery & FindingsBaseProps & FindingsBaseESQueryConfig) => {
  try {
    return {
      query: buildEsQuery(dataView, query, filters, config), // will throw for malformed query
    };
  } catch (error) {
    return {
      query: undefined,
      error: error instanceof Error ? error : new Error('Unknown Error'),
    };
  }
};

type TablePagination = NonNullable<EuiBasicTableProps<unknown>['pagination']>;

export const getPaginationTableParams = (
  params: TablePagination & Pick<Required<TablePagination>, 'pageIndex' | 'pageSize'>,
  pageSizeOptions = [10, 25, 100],
  showPerPageOptions = true
): Required<TablePagination> => ({
  ...params,
  pageSizeOptions,
  showPerPageOptions,
});

export const getPaginationQuery = ({
  pageIndex,
  pageSize,
}: Pick<Pagination, 'pageIndex' | 'pageSize'>) => ({
  from: pageIndex * pageSize,
  size: pageSize,
});

export const useBaseEsQuery = ({
  dataView,
  filters,
  query,
}: FindingsBaseURLQuery & FindingsBaseProps) => {
  const {
    notifications: { toasts },
    data: {
      query: { filterManager, queryString },
    },
    uiSettings,
  } = useKibana().services;
  const allowLeadingWildcards = uiSettings.get('query:allowLeadingWildcards');
  const config: EsQueryConfig = useMemo(() => ({ allowLeadingWildcards }), [allowLeadingWildcards]);
  const baseEsQuery = useMemo(
    () => getBaseQuery({ dataView, filters, query, config }),
    [dataView, filters, query, config]
  );

  /**
   * Sync filters with the URL query
   */
  useEffect(() => {
    filterManager.setAppFilters(filters);
    queryString.setQuery(query);
  }, [filters, filterManager, queryString, query]);

  const handleMalformedQueryError = () => {
    const error = baseEsQuery.error;
    if (error) {
      toasts.addError(error, {
        title: i18n.translate('xpack.csp.findings.search.queryErrorToastMessage', {
          defaultMessage: 'Query Error',
        }),
        toastLifeTimeMs: 1000 * 5,
      });
    }
  };

  useEffect(handleMalformedQueryError, [baseEsQuery.error, toasts]);

  return baseEsQuery;
};

export const usePersistedQuery = <T>(getter: ({ filters, query }: FindingsBaseURLQuery) => T) => {
  const {
    data: {
      query: { filterManager, queryString },
    },
  } = useKibana().services;

  return useCallback(
    () =>
      getter({
        filters: filterManager.getAppFilters(),
        query: queryString.getQuery() as Query,
      }),
    [getter, filterManager, queryString]
  );
};

export const getDefaultQuery = ({ query, filters }: any): any => ({
  query,
  filters,
  sort: { field: '@timestamp', direction: 'desc' },
  pageIndex: 0,
});
