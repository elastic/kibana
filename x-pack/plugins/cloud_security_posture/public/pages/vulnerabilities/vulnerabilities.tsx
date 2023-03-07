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
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';

interface VulnerabilityRecord {
  actions: any;
  severity: string;
  vulnerabilities: string;
  resource: string;
  cvss: string;
  exploitability: string;
  'package-version': string;
  'fix-version': string;
}

const data: VulnerabilityRecord[] = [
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.6',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
  {
    actions: <EuiButtonIcon color="primary" iconType="expand" />,
    severity: 'high',
    vulnerabilities: 'CVE-2019-5736',
    resource: 'alpine:3.10',
    cvss: '7.5',
    exploitability: 'High',
    'package-version': '1.30-r1',
    'fix-version': '1.30-r2',
  },
];

export const Vulnerabilities = () => {
  // Pagination
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
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
  const [sortingColumns, setSortingColumns] = useState([]);
  const onSort = useCallback(
    (sort) => {
      setSortingColumns(sort);
    },
    [setSortingColumns]
  );

  const columns: EuiDataGridColumn[] = [
    {
      id: 'actions',
      initialWidth: 40,
      display: <></>,
      isSortable: false,
      isExpandable: false,
      actions: false,
      isResizable: false,
    },
    {
      id: 'severity',
      displayAsText: 'Severity',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
    },
    {
      id: 'vulnerabilities',
      displayAsText: 'Vulnerabilities',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
    },
    {
      id: 'resource',
      displayAsText: 'Resource',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
    },
    {
      id: 'cvss',
      displayAsText: 'CVSS',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
    },
    {
      id: 'exploitability',
      displayAsText: 'Exploitability',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
    },
    {
      id: 'package-version',
      displayAsText: 'Package and Version',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
    },
    {
      id: 'fix-version',
      displayAsText: 'Fix Version',
      isExpandable: false,
      isResizable: false,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
      },
    },
  ];

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }) => {
      return data.hasOwnProperty(rowIndex) ? data[rowIndex][columnId] : null;
    };
  }, []);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiDataGrid
        css={css`
          & .euiDataGridHeaderCell__icon {
            display: none;
          }
        `}
        aria-label="Data grid styling demo"
        columns={columns}
        columnVisibility={{
          visibleColumns: columns.map(({ id }) => id),
          setVisibleColumns: () => {},
        }}
        // sorting={{ columns: sortingColumns, onSort }}
        rowCount={data.length}
        toolbarVisibility={{
          showColumnSelector: false,
          showDisplaySelector: false,
          showKeyboardShortcuts: false,
          additionalControls: {
            left: {
              prepend: (
                <EuiButtonEmpty size="xs" color="text">
                  {data.length} Vulnerabilities
                </EuiButtonEmpty>
              ),
            },
          },
        }}
        gridStyle={{
          border: 'none',
          //   // fontSize: fontSize,
          //   // cellPadding: cellPadding,
          stripes: false,
          rowHover: 'none',
          header: 'underline',
          //   // rowHover: rowHover,
          //   // header: header,
          //   // footer: footer,
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
