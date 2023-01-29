/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery, type Query } from '@kbn/es-query';
import type { EuiBasicTableProps, EuiThemeComputed, Pagination } from '@elastic/eui';
import { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { estypes } from '@elastic/elasticsearch';
import type { FindingsBaseProps, FindingsBaseURLQuery } from '../types';
import { useKibana } from '../../../common/hooks/use_kibana';
import type { CspFinding } from '../../../../common/schemas/csp_finding';
export { getFilters } from './get_filters';

const getBaseQuery = ({ dataView, query, filters }: FindingsBaseURLQuery & FindingsBaseProps) => {
  try {
    return {
      query: buildEsQuery(dataView, query, filters), // will throw for malformed query
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
  } = useKibana().services;

  const baseEsQuery = useMemo(
    () => getBaseQuery({ dataView, filters, query }),
    [dataView, filters, query]
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

export const getFindingsPageSizeInfo = ({
  currentPageSize,
  pageIndex,
  pageSize,
}: Record<'pageIndex' | 'pageSize' | 'currentPageSize', number>) => ({
  pageStart: pageIndex * pageSize + 1,
  pageEnd: pageIndex * pageSize + currentPageSize,
});

export const getFindingsCountAggQuery = () => ({
  count: { terms: { field: 'result.evaluation' } },
  '2': {
    multi_terms: {
      terms: [{ field: 'resource.id' }, { field: 'rule.id' }],
      size: 10000,
    },
    aggs: {
      '1': {
        top_hits: {
          _source: true,
          size: 1,
          sort: [
            {
              '@timestamp': {
                order: 'desc',
              },
            },
          ],
        },
      },
    },
  },
});

export const getAggregationCount = (buckets: estypes.AggregationsStringRareTermsBucketKeys[]) => {
  const passed = buckets.find((bucket) => bucket.key === 'passed');
  const failed = buckets.find((bucket) => bucket.key === 'failed');

  return {
    passed: passed?.doc_count || 0,
    failed: failed?.doc_count || 0,
  };
};

const isSelectedRow = (row: CspFinding, selected?: CspFinding) =>
  row.resource.id === selected?.resource.id && row.rule.id === selected?.rule.id;

export const getSelectedRowStyle = (
  theme: EuiThemeComputed,
  row: CspFinding,
  selected?: CspFinding
): React.CSSProperties => ({
  background: isSelectedRow(row, selected) ? theme.colors.highlight : undefined,
});
