/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CriteriaWithPagination,
  EuiTableSortingType,
  Pagination,
} from '@elastic/eui';
import { orderBy } from 'lodash';
import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import uuid from 'uuid';
import { fromQuery, toQuery } from '../components/shared/links/url_helpers';
import { useApmParams } from './use_apm_params';

interface Initials<T extends any[]> {
  // totalItemCount is not necessary here
  initialPagination: Omit<Pagination, 'totalItemCount'>;
  initialSort?: EuiTableSortingType<T[0]>;
}

type Props<T extends any[]> = {
  items: T;
  urlState?: boolean;
} & Initials<T>;

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function useTablePagination<T extends any[]>({
  items,
  initialPagination,
  initialSort = {},
  urlState = false,
}: Props<T>): {
  onTableChange: (criteriaWithPagination: CriteriaWithPagination<T[0]>) => void;
  tableSort?: EuiTableSortingType<T[0]>;
  tablePagination: Pagination;
  tableItems: any[];
  totalItems: number;
  requestId: string;
} {
  const { query } = useApmParams('/*');

  const { tableOptionsUrl, onTableChangeUrl } = useTablePaginationUrl({
    initialPagination,
    initialSort,
  });

  const [tableOptionsState, setTableOptionsState] = useState<
    CriteriaWithPagination<T[0]>
  >({
    page: {
      index: initialPagination.pageIndex,
      size: initialPagination.pageSize,
    },
    sort: initialSort.sort,
  });

  const tableOptions = useMemo(
    () => (urlState ? tableOptionsUrl : tableOptionsState),
    [urlState, tableOptionsUrl, tableOptionsState]
  );

  const offset = 'offset' in query ? query.offset : undefined;
  const comparisonEnabled =
    'comparisonEnabled' in query ? query.comparisonEnabled : undefined;

  const { tableItems, requestId } = useMemo(
    () => {
      return {
        tableItems: orderBy(
          items,
          tableOptions.sort?.field,
          tableOptions.sort?.direction
        ).slice(
          tableOptions.page.index * tableOptions.page.size,
          (tableOptions.page.index + 1) * tableOptions.page.size
        ),
        // Generate a new id everytime the table options are changed
        requestId: uuid(),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      items,
      tableOptions,
      // not used, but needed to trigger an update when offset is changed either manually by user or when time range is changed
      offset,
      // not used, but needed to trigger an update when comparison feature is disabled/enabled by user
      comparisonEnabled,
    ]
  );

  const tablePagination: Pagination = useMemo(
    () => ({
      pageIndex: tableOptions.page.index,
      pageSize: tableOptions.page.size,
      totalItemCount: items.length,
      pageSizeOptions: initialPagination.pageSizeOptions || PAGE_SIZE_OPTIONS,
      showPerPageOptions: initialPagination.showPerPageOptions || false,
    }),
    [tableOptions, items, initialPagination]
  );

  const tableSort: EuiTableSortingType<T[0]> = useMemo(() => {
    return { ...initialSort, sort: tableOptions.sort };
  }, [tableOptions, initialSort]);

  return {
    requestId,
    onTableChange: urlState ? onTableChangeUrl : setTableOptionsState,
    tableSort,
    tablePagination,
    tableItems,
    totalItems: 0,
  };
}

function useTablePaginationUrl<T extends any[]>({
  initialPagination,
  initialSort = {},
}: Initials<T>) {
  const history = useHistory();
  const { query } = useApmParams('/*');
  const pageUrl =
    'page' in query && query.page ? query.page : initialPagination.pageIndex;
  const pageSizeUrl =
    'pageSize' in query && query.pageSize
      ? query.pageSize
      : initialPagination.pageSize;
  const sortFieldUrl =
    'sortField' in query
      ? (query.sortField as keyof T[0])
      : initialSort.sort?.field;
  const sortDirectionUrl =
    'sortDirection' in query
      ? query.sortDirection
      : initialSort.sort?.direction;

  const tableOptionsUrl: CriteriaWithPagination<T[0]> = useMemo(
    () => ({
      page: {
        index: pageUrl,
        size: pageSizeUrl,
      },
      sort:
        sortFieldUrl && sortDirectionUrl
          ? { field: sortFieldUrl, direction: sortDirectionUrl }
          : undefined,
    }),
    [pageUrl, pageSizeUrl, sortFieldUrl, sortDirectionUrl]
  );

  function onTableChangeUrl(newTableOptions: CriteriaWithPagination<T[0]>) {
    history.push({
      ...history.location,
      search: fromQuery({
        ...toQuery(history.location.search),
        page: newTableOptions.page.index,
        pageSize: newTableOptions.page.size,
        sortField: newTableOptions.sort?.field,
        sortDirection: newTableOptions.sort?.direction,
      }),
    });
  }

  return {
    tableOptionsUrl,
    onTableChangeUrl,
  };
}
