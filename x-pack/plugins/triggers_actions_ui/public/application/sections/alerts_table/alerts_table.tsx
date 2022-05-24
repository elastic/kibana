/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';
import React, { useState, Suspense, lazy, useCallback, useMemo, useEffect } from 'react';
import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiButtonIcon,
  EuiDataGridStyle,
  EuiDataGridCellValueProps,
  EuiDataGridColumn,
} from '@elastic/eui';
import { useSorting, usePagination } from './hooks';
import { AlertsTableProps } from '../../../types';
import {
  ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL,
  ALERTS_TABLE_CONTROL_COLUMNS_VIEW_DETAILS_LABEL,
} from './translations';
import './alerts_table.scss';

export const ACTIVE_ROW_CLASS = 'alertsTableActiveRow';
const AlertsFlyout = lazy(() => import('./alerts_flyout'));
const GridStyles: EuiDataGridStyle = {
  border: 'horizontal',
  header: 'underline',
};

const AlertsTable: React.FunctionComponent<AlertsTableProps> = (props: AlertsTableProps) => {
  const [rowClasses, setRowClasses] = useState<EuiDataGridStyle['rowClasses']>({});
  const {
    activePage,
    alerts,
    alertsCount,
    isLoading,
    onColumnsChange,
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

  const onChangeVisibleColumns = useCallback(
    (newColumns: string[]) => {
      setVisibleColumns(newColumns);
      onColumnsChange(
        newColumns.map((cid) => props.columns.find((oc) => oc.id === cid)) as EuiDataGridColumn[]
      );
    },
    [onColumnsChange, props.columns]
  );

  const leadingControlColumns = useMemo(() => {
    return [
      ...(props.showExpandToDetails
        ? [
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
          ]
        : []),
      ...props.leadingControlColumns,
    ];
  }, [props.leadingControlColumns, props.showExpandToDetails, setFlyoutAlertIndex]);

  useEffect(() => {
    // Row classes do not deal with visible row indices so we need to handle page offset
    const rowIndex = flyoutAlertIndex + pagination.pageIndex * pagination.pageSize;
    setRowClasses({
      [rowIndex]: ACTIVE_ROW_CLASS,
    });
  }, [flyoutAlertIndex, pagination.pageIndex, pagination.pageSize]);

  const handleFlyoutClose = useCallback(() => setFlyoutAlertIndex(-1), [setFlyoutAlertIndex]);

  // TODO when every solution is using this table, we will be bale to simplify it by just passing the alert index
  const handleFlyoutAlert = useCallback(
    (alert) => {
      const idx = alerts.findIndex((a) =>
        (a as any)[ALERT_UUID].includes(alert.fields[ALERT_UUID])
      );
      setFlyoutAlertIndex(idx);
    },
    [alerts, setFlyoutAlertIndex]
  );

  const basicRenderCellValue = ({
    data,
    columnId,
  }: {
    data: Array<{ field: string; value: string[] }>;
    columnId: string;
  }) => {
    // any is required here to improve typescript performance
    const value = data.find((d) => d.field === columnId)?.value ?? [];
    return <>{value.length ? value.join() : '--'}</>;
  };

  const handleRenderCellValue = useCallback(
    (improper: EuiDataGridCellValueElementProps) => {
      const rcvProps = improper as EuiDataGridCellValueElementProps & EuiDataGridCellValueProps;
      const alert = alerts[rcvProps.rowIndex];
      const renderCellValue = props.alertsTableConfiguration?.getRenderCellValue
        ? props.alertsTableConfiguration?.getRenderCellValue({
            setFlyoutAlert: handleFlyoutAlert,
          })
        : basicRenderCellValue;
      const data: Array<{ field: string; value: string[] }> = [];
      Object.entries(alert ?? {}).forEach(([key, value]) => {
        data.push({ field: key, value });
      });
      return renderCellValue({
        ...rcvProps,
        data,
      });
    },
    [alerts, handleFlyoutAlert, props.alertsTableConfiguration]
  );

  return (
    <section style={{ width: '100%' }} data-test-subj={props['data-test-subj']}>
      {flyoutAlertIndex > -1 && (
        <Suspense fallback={null}>
          <AlertsFlyout
            alert={alerts[flyoutAlertIndex]}
            alertsCount={alertsCount}
            state={props.flyoutState}
            onClose={handleFlyoutClose}
            alertsTableConfiguration={props.alertsTableConfiguration}
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
        columnVisibility={{ visibleColumns, setVisibleColumns: onChangeVisibleColumns }}
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
