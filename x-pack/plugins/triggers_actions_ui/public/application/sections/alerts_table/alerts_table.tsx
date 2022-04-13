/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridCellValueProps,
} from '@elastic/eui';
import { useSorting, usePagination } from './hooks';
import { AlertsTableProps, AlertsField } from '../../../types';
import { getLeadingControlColumns } from './lib';
const AlertsFlyout = lazy(() => import('./alerts_flyout'));

const AlertsTable: React.FunctionComponent<AlertsTableProps> = (props: AlertsTableProps) => {
  const { activePage, alertsCount, onPageChange, onSortChange } = props.useFetchAlertsData();
  // const [rowClasses, setRowClasses] = useState<{ [rowIndex: number]: string }>({});
  const { sortingColumns, onSort } = useSorting(onSortChange);
  const {
    pagination,
    onChangePageSize,
    onChangePageIndex,
    onPaginateRowNext,
    onPaginateRowPrevious,
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
    return getLeadingControlColumns({
      leadingControlColumns: props.leadingControlColumns,
      flyoutAlertIndex,
      setFlyoutAlertIndex,
    });
  }, [props.leadingControlColumns, flyoutAlertIndex, setFlyoutAlertIndex]);

  const handleFlyoutClose = useCallback(() => setFlyoutAlertIndex(-1), [setFlyoutAlertIndex]);
  return (
    <section data-test-subj={props['data-test-subj']}>
      {flyoutAlertIndex > -1 && (
        <Suspense fallback={null}>
          <AlertsFlyout
            alert={props.alerts[flyoutAlertIndex]}
            onClose={handleFlyoutClose}
            onPaginateNext={onPaginateRowNext}
            onPaginatePrevious={onPaginateRowPrevious}
          />
        </Suspense>
      )}
      <EuiDataGrid
        aria-label="Alerts table"
        columns={props.columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        trailingControlColumns={props.trailingControlColumns}
        leadingControlColumns={leadingControlColumns}
        rowCount={alertsCount}
        renderCellValue={(improper: EuiDataGridCellValueElementProps) => {
          const rcvProps = improper as EuiDataGridCellValueElementProps & EuiDataGridCellValueProps;
          const alert = props.alerts[rcvProps.visibleRowIndex];
          return props.renderCellValue({
            ...rcvProps,
            alert,
            field: rcvProps.columnId as AlertsField,
          });
        }}
        sorting={{ columns: sortingColumns, onSort }}
        pagination={{
          ...pagination,
          pageSizeOptions: props.pageSizeOptions,
          onChangeItemsPerPage: onChangePageSize,
          onChangePage: onChangePageIndex,
        }}
        // gridStyle={{ rowClasses }} This exists in EUI 54 so we can use once Kibana is upgraded
      />
    </section>
  );
};

export { AlertsTable };
// eslint-disable-next-line import/no-default-export
export { AlertsTable as default };
