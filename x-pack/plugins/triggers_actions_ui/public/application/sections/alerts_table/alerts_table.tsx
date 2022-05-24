/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Suspense, lazy, useCallback, useMemo, useEffect } from 'react';
import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridCellValueProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiButtonIcon,
  EuiDataGridStyle,
} from '@elastic/eui';
import { useSorting, usePagination } from './hooks';
import { AlertsTableProps } from '../../../types';
import {
  ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL,
  ALERTS_TABLE_CONTROL_COLUMNS_VIEW_DETAILS_LABEL,
} from './translations';
import './alerts_table.scss';

export const ACTIVE_ROW_CLASS = 'alertsTableActiveRow';

const GridStyles: EuiDataGridStyle = {
  border: 'horizontal',
  header: 'underline',
};

const AlertsFlyout = lazy(() => import('./alerts_flyout'));

const AlertsTable: React.FunctionComponent<AlertsTableProps> = (props: AlertsTableProps) => {
  const [rowClasses, setRowClasses] = useState<EuiDataGridStyle['rowClasses']>({});
  const {
    activePage,
    alerts,
    alertsCount,
    isLoading,
    onPageChange,
    onSortChange,
    sort: sortingFields,
  } = props.useFetchAlertsData();
  const { sortingColumns, onSort } = useSorting(onSortChange, sortingFields);
  const {
    pagination,
    onChangePageSize,
    onChangePageIndex,
    onPaginateFlyout,
    flyoutAlertIndex,
    setFlyoutAlertIndex,
  } = usePagination({
    onPageChange,
    pageIndex: activePage,
    pageSize: props.pageSize,
    alertsCount,
  });

  const [visibleColumns, setVisibleColumns] = useState(props.columns.map(({ id }) => id));

  const leadingControlColumns = useMemo(() => {
    return [
      {
        id: 'expandColumn',
        width: 50,
        headerCellRender: () => {
          return (
            <span data-test-subj="expandColumnHeaderLabel">
              {ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL}
            </span>
          );
        },
        rowCellRender: (cveProps: EuiDataGridCellValueElementProps) => {
          const { visibleRowIndex } = cveProps as EuiDataGridCellValueElementProps & {
            visibleRowIndex: number;
          };
          return (
            <EuiFlexGroup gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={ALERTS_TABLE_CONTROL_COLUMNS_VIEW_DETAILS_LABEL}>
                  <EuiButtonIcon
                    size="s"
                    iconType="expand"
                    color="text"
                    onClick={() => {
                      setFlyoutAlertIndex(visibleRowIndex);
                    }}
                    data-test-subj={`expandColumnCellOpenFlyoutButton-${visibleRowIndex}`}
                    aria-label={ALERTS_TABLE_CONTROL_COLUMNS_VIEW_DETAILS_LABEL}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      ...props.leadingControlColumns,
    ];
  }, [props.leadingControlColumns, setFlyoutAlertIndex]);

  useEffect(() => {
    // Row classes do not deal with visible row indices so we need to handle page offset
    const rowIndex = flyoutAlertIndex + pagination.pageIndex * pagination.pageSize;
    setRowClasses({
      [rowIndex]: ACTIVE_ROW_CLASS,
    });
  }, [flyoutAlertIndex, pagination.pageIndex, pagination.pageSize]);

  const handleFlyoutClose = useCallback(() => setFlyoutAlertIndex(-1), [setFlyoutAlertIndex]);

  const handleRenderCellValue = useCallback(
    (improper: EuiDataGridCellValueElementProps) => {
      const rcvProps = improper as EuiDataGridCellValueElementProps & EuiDataGridCellValueProps;
      const alert = alerts[rcvProps.visibleRowIndex];
      return props.renderCellValue({
        ...rcvProps,
        alert,
        field: rcvProps.columnId,
      });
    },
    [alerts, props]
  );

  return (
    <section style={{ width: '100%' }} data-test-subj={props['data-test-subj']}>
      {flyoutAlertIndex > -1 && (
        <Suspense fallback={null}>
          <AlertsFlyout
            alert={alerts[flyoutAlertIndex]}
            alertsCount={alertsCount}
            onClose={handleFlyoutClose}
            flyoutIndex={flyoutAlertIndex + pagination.pageIndex * pagination.pageSize}
            onPaginate={onPaginateFlyout}
            isLoading={isLoading}
          />
        </Suspense>
      )}
      <EuiDataGrid
        aria-label="Alerts table"
        data-test-subj="alertsTable"
        columns={props.columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        trailingControlColumns={props.trailingControlColumns}
        leadingControlColumns={leadingControlColumns}
        rowCount={alertsCount}
        renderCellValue={handleRenderCellValue}
        gridStyle={{ ...GridStyles, rowClasses }}
        sorting={{ columns: sortingColumns, onSort }}
        pagination={{
          ...pagination,
          pageSizeOptions: props.pageSizeOptions,
          onChangeItemsPerPage: onChangePageSize,
          onChangePage: onChangePageIndex,
        }}
      />
    </section>
  );
};

export { AlertsTable };
// eslint-disable-next-line import/no-default-export
export { AlertsTable as default };
