/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { useSorting, usePagination } from './hooks';
import { AlertsTableProps, AlertsField } from '../../../types';
const AlertsFlyout = lazy(() => import('./alerts_flyout'));

const ACTIONS_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.column.actions',
  {
    defaultMessage: 'Actions',
  }
);

const VIEW_DETAILS_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.leadingControl.viewDetails',
  {
    defaultMessage: 'View details',
  }
);

const AlertsTable: React.FunctionComponent<AlertsTableProps> = (props: AlertsTableProps) => {
  const { activePage, alertsCount, onPageChange, onSortChange } = props.useFetchAlertsData();
  const [flyoutAlertIndex, setFlyoutAlertIndex] = useState<number>(-1);
  // const [rowClasses, setRowClasses] = useState<{ [rowIndex: number]: string }>({});
  const { sortingColumns, onSort } = useSorting(onSortChange);
  const { pagination, onChangePageSize, onChangePageIndex } = usePagination({
    onPageChange,
    pageIndex: activePage,
    pageSize: props.pageSize,
  });

  const [visibleColumns, setVisibleColumns] = useState(props.columns.map(({ id }) => id));

  const leadingControlColumns = useMemo(() => {
    return [
      {
        id: 'expand',
        width: 120,
        headerCellRender: () => {
          return <span>{ACTIONS_LABEL}</span>;
        },
        rowCellRender: (cveProps: EuiDataGridCellValueElementProps) => {
          const { visibleRowIndex } = cveProps as EuiDataGridCellValueElementProps & {
            visibleRowIndex: number;
          };
          return (
            <EuiFlexGroup gutterSize="none" responsive={false}>
              {flyoutAlertIndex === visibleRowIndex ? (
                <EuiFlexItem grow={false}>
                  <EuiIcon type="alert" />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiToolTip content={VIEW_DETAILS_LABEL}>
                  <EuiButtonIcon
                    size="s"
                    iconType="expand"
                    color="text"
                    onClick={() => {
                      // setRowClasses({
                      //   ...rowClasses,
                      //   [visibleRowIndex]: 'active',
                      // });
                      setFlyoutAlertIndex(visibleRowIndex);
                    }}
                    data-test-subj="openFlyoutButton"
                    aria-label={VIEW_DETAILS_LABEL}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      ...props.leadingControlColumns,
    ];
  }, [props.leadingControlColumns, flyoutAlertIndex, setFlyoutAlertIndex]);

  const handleFlyoutClose = useCallback(() => setFlyoutAlertIndex(-1), []);

  const paginateRow = useCallback(
    (newFlyoutAlertIndex: number) => {
      const lastPage = Math.floor(alertsCount / pagination.pageSize) - 1;
      if (newFlyoutAlertIndex < 0) {
        setFlyoutAlertIndex(pagination.pageSize - 1);
        onChangePageIndex(lastPage);
        return;
      }

      if (newFlyoutAlertIndex >= pagination.pageSize) {
        setFlyoutAlertIndex(0);
        onChangePageIndex(
          pagination.pageIndex === lastPage ? 0 : Math.min(pagination.pageIndex + 1, lastPage)
        );
        return;
      }

      setFlyoutAlertIndex(newFlyoutAlertIndex);
    },
    [pagination, alertsCount, onChangePageIndex]
  );

  const onPaginateRowNext = useCallback(
    () => paginateRow(flyoutAlertIndex + 1),
    [paginateRow, flyoutAlertIndex]
  );
  const onPaginateRowPrevious = useCallback(
    () => paginateRow(flyoutAlertIndex - 1),
    [paginateRow, flyoutAlertIndex]
  );

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
          const rcvProps = improper as EuiDataGridCellValueElementProps & {
            visibleRowIndex: number;
          };
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
