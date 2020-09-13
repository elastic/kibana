/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiDataGrid, EuiSpacer } from '@elastic/eui';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';

export function HighTrafficPages() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;
  const [sortingColumns, setSortingColumns] = useState([
    {
      id: 'percentage',
      direction: 'desc',
    },
  ]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum-client/high-traffic-pages',
          params: {
            query: {
              start,
              end,
              pageSize: String(pagination.pageSize),
              pageIndex: String(pagination.pageIndex),
              uiFilters: JSON.stringify(uiFilters),
              sorting: JSON.stringify(sortingColumns),
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, serviceName, uiFilters, pagination, sortingColumns]
  );

  const columns = [
    {
      id: 'url',
      display: 'Url',
      displayAsText: 'Url',
      defaultSortDirection: 'asc',
    },
    {
      display: 'Page load duration',
      displayAsText: 'Page load duration',
      id: 'medianDuration',
      align: 'right' as const,
    },
    {
      display: 'Blocking time',
      displayAsText: 'Blocking time',
      id: 'medianTbt',
      align: 'right' as const,
    },
    {
      display: '% of total page views',
      displayAsText: '% of total page views',
      id: 'percentage',
      align: 'right' as const,
    },
  ];

  const [visibleColumns, setVisibleColumns] = useState(() =>
    columns.map(({ id }) => id)
  );

  const onChangeItemsPerPage = useCallback(
    (pageSize) =>
      setPagination((pagination) => ({
        ...pagination,
        pageSize,
        pageIndex: 0,
      })),
    [setPagination]
  );
  const onChangePage = useCallback(
    (pageIndex) =>
      setPagination((pagination) => ({ ...pagination, pageIndex })),
    [setPagination]
  );

  const items = data?.items ?? [];

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId, setCellProps }) => {
      return items.hasOwnProperty(rowIndex) ? items[rowIndex][columnId] : null;
    };
  }, [items]);

  const onSort = useCallback(
    (sortingColumns) => {
      setSortingColumns(sortingColumns);
    },
    [setSortingColumns]
  );

  return (
    <>
      <EuiSpacer size="s" />
      <EuiDataGrid
        aria-label="High traffic pages"
        columns={columns}
        rowCount={data?.total ?? 0}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        renderCellValue={renderCellValue}
        toolbarVisibility={{
          showStyleSelector: false,
          showFullScreenSelector: false,
        }}
        pagination={{
          ...pagination,
          pageSizeOptions: [5, 10, 15, 20],
          onChangeItemsPerPage: onChangeItemsPerPage,
          onChangePage: onChangePage,
        }}
        sorting={{ columns: sortingColumns, onSort }}
      />
    </>
  );
}
