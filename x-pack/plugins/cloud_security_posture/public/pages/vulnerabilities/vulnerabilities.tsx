/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiDataGrid,
  EuiDataGridColumn,
  EuiDataGridProps,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { usePageSize } from '../../common/hooks/use_page_size';
import { useUrlQuery } from '../../common/hooks/use_url_query';
import { useLimitProperties } from '../configurations/utils/get_limit_properties';
import {
  getPaginationTableParams,
  useBaseEsQuery,
  usePersistedQuery,
} from '../configurations/utils/utils';
import { useLatestVulnerabilities } from './hooks/use_latest_vulnerabilities';
import { VulnerabilityRecord } from './types';
import { getVulnerabilitiesColumns } from './utils';

const VULN_MGMT_FINDINGS_SORT_KEY = 'csp:vuln-mgmt:findings-sort';
const VULN_MGMT_FINDINGS_PAGINATION_KEY = 'csp:vuln-mgmt:findings-pagination';

export const getDefaultQuery = ({ query, filters }: any): any => ({
  query,
  filters,
  sort: { field: '@timestamp', direction: 'desc' },
  pageIndex: 0,
});

const defaultSorting = {
  id: 'cvss',
  direction: 'desc',
};

export const Vulnerabilities = () => {
  const getPersistedDefaultQuery = usePersistedQuery(getDefaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery(getPersistedDefaultQuery);
  // const { pageSize, setPageSize } = usePageSize('vulnerabilities-pagination');

  /**
   * Page ES query result
   */
  const { data, isLoading } = useLatestVulnerabilities({
    query: urlQuery.query,
    sort: urlQuery.sort,
    enabled: true,
  });
  // Pagination
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const onChangeItemsPerPage = useCallback(
    (pageSize) =>
      setPagination((paginationState) => ({
        ...paginationState,
        pageSize,
        pageIndex: 0,
      })),
    [setPagination]
  );
  const onChangePage = useCallback(
    (pageIndex) => setPagination((paginationState) => ({ ...paginationState, pageIndex })),
    [setPagination]
  );

  // Sorting
  const [sortingColumns, setSortingColumns] = useState([defaultSorting]);
  const onSort = useCallback(
    (sort) => {
      setSortingColumns(sort);
    },
    [setSortingColumns]
  );

  const renderCellValue = useMemo(() => {
    return ({
      rowIndex,
      columnId,
    }: {
      rowIndex: number;
      columnId: typeof columns[number]['id'];
    }) => {
      const vulnerabilityIndex =
        Math.floor(pagination?.pageIndex * pagination?.pageSize) + rowIndex;

      const vulnerability = data?.page[vulnerabilityIndex] as VulnerabilityRecord;

      if (!vulnerability) return null;

      if (columnId === 'actions') {
        return (
          <EuiButtonIcon
            iconType="expand"
            color="primary"
            aria-label="View"
            onClick={() => {
              alert(`Flyout id ${vulnerability.finding?.vulnerability?.id}`);
            }}
          />
        );
      }
      if (columnId === 'vulnerability') {
        return vulnerability.finding?.vulnerability?.id || null;
      }
      if (columnId === 'cvss') {
        return (
          <>
            {vulnerability.finding?.vulnerability.score.base}|
            {vulnerability.finding?.vulnerability.score.version}
          </>
        );
      }
      if (columnId === 'resource') {
        return vulnerability.resource?.name || null;
      }
      if (columnId === 'severity') {
        return <>{vulnerability.finding?.vulnerability.severity || null}</>;
      }
      if (columnId === 'package-version') {
        return (
          <>
            {vulnerability.finding?.vulnerability.package.name}{' '}
            {vulnerability.finding?.vulnerability.package.version}
          </>
        );
      }
      if (columnId === 'fix-version') {
        return vulnerability.finding?.vulnerability.package.fixed_version || null;
      }
    };
  }, [data, pagination?.pageIndex, pagination?.pageSize]);

  if (isLoading || !data) {
    return <EuiLoadingSpinner />;
  }

  const columns = getVulnerabilitiesColumns();

  return (
    <>
      <EuiSpacer size="l" />
      <EuiDataGrid
        css={css`
          & .euiDataGridHeaderCell__icon {
            display: none;
          }
          & .euiDataGrid__controls {
            border-bottom: none;
          }
        `}
        aria-label="Data grid styling demo"
        columns={columns}
        columnVisibility={{
          visibleColumns: columns.map(({ id }) => id),
          setVisibleColumns: () => {},
        }}
        // sorting={{ columns: sortingColumns, onSort }}
        rowCount={data?.total}
        toolbarVisibility={{
          showColumnSelector: false,
          showDisplaySelector: false,
          showKeyboardShortcuts: false,
          additionalControls: {
            left: {
              prepend: (
                <EuiButtonEmpty size="xs" color="text">
                  {data?.total} Vulnerabilities
                </EuiButtonEmpty>
              ),
            },
          },
        }}
        gridStyle={{
          border: 'horizontal',
          cellPadding: 'l',
          stripes: false,
          rowHover: 'none',
          header: 'underline',
        }}
        renderCellValue={renderCellValue}
        inMemory={{ level: 'sorting' }}
        sorting={{ columns: sortingColumns, onSort }}
        pagination={{
          ...pagination,
          pageSizeOptions: [10, 50, 100],
          onChangeItemsPerPage,
          onChangePage,
        }}
      />
    </>
  );
};
