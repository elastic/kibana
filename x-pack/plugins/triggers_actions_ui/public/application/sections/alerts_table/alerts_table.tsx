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
} from '@elastic/eui';
import { useSorting, usePagination } from './hooks';
import { AlertsTableProps } from '../../../types';
import {
  ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL,
  ALERTS_TABLE_CONTROL_COLUMNS_VIEW_DETAILS_LABEL,
} from './translations';

import './alerts_table.scss';

export const ACTIVE_ROW_CLASS = 'alertsTableActiveRow';
const DEFAULT_ACTIONS_COLUMNS_WIDTH = 75;
const AlertsFlyout = lazy(() => import('./alerts_flyout'));
const GridStyles: EuiDataGridStyle = {
  border: 'none',
  header: 'underline',
  fontSize: 's',
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
  });
  const { useActionsColumn = () => ({ renderCustomActionsRow: undefined, width: undefined }) } =
    props.alertsTableConfiguration;

  const [visibleColumns, setVisibleColumns] = useState(props.visibleColumns);

  const onChangeVisibleColumns = useCallback(
    (newColumns: string[]) => {
      setVisibleColumns(newColumns);
      onColumnsChange(
        props.columns.sort((a, b) => newColumns.indexOf(a.id) - newColumns.indexOf(b.id)),
        newColumns
      );
    },
    [onColumnsChange, props.columns]
  );

  const { renderCustomActionsRow, width: actionsColumnWidth = DEFAULT_ACTIONS_COLUMNS_WIDTH } =
    useActionsColumn();

  const leadingControlColumns = useMemo(() => {
    if (!props.showExpandToDetails && !renderCustomActionsRow) return props.leadingControlColumns;

    return [
      {
        id: 'expandColumn',
        width: actionsColumnWidth,
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
          const customActionsRow =
            renderCustomActionsRow && renderCustomActionsRow(alerts[visibleRowIndex]);

          return (
            <EuiFlexGroup gutterSize="none" responsive={false}>
              {props.showExpandToDetails && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={ALERTS_TABLE_CONTROL_COLUMNS_VIEW_DETAILS_LABEL}>
                    <EuiButtonIcon
                      size="s"
                      iconType="expand"
                      color="primary"
                      onClick={() => {
                        setFlyoutAlertIndex(visibleRowIndex);
                      }}
                      data-test-subj={`expandColumnCellOpenFlyoutButton-${visibleRowIndex}`}
                      aria-label={ALERTS_TABLE_CONTROL_COLUMNS_VIEW_DETAILS_LABEL}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
              {customActionsRow && customActionsRow}
            </EuiFlexGroup>
          );
        },
      },
      ...props.leadingControlColumns,
    ];
  }, [
    actionsColumnWidth,
    alerts,
    props.leadingControlColumns,
    props.showExpandToDetails,
    renderCustomActionsRow,
    setFlyoutAlertIndex,
  ]);

  useEffect(() => {
    // Row classes do not deal with visible row indices so we need to handle page offset
    const rowIndex = flyoutAlertIndex + pagination.pageIndex * pagination.pageSize;
    setRowClasses({
      [rowIndex]: ACTIVE_ROW_CLASS,
    });
  }, [flyoutAlertIndex, pagination.pageIndex, pagination.pageSize]);

  const handleFlyoutClose = useCallback(() => setFlyoutAlertIndex(-1), [setFlyoutAlertIndex]);

  // TODO when every solution is using this table, we will be able to simplify it by just passing the alert index
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
    const value = data.find((d) => d.field === columnId)?.value ?? [];
    // console.log({ data, columnId })
    return <>{value.length ? value.join() : '--'}</>;
  };

  const renderCellValue = useCallback(
    () =>
      props.alertsTableConfiguration?.getRenderCellValue
        ? props.alertsTableConfiguration?.getRenderCellValue({
            setFlyoutAlert: handleFlyoutAlert,
          })
        : basicRenderCellValue,
    [handleFlyoutAlert, props.alertsTableConfiguration]
  )();

  const handleRenderCellValue = useCallback(
    (_props: EuiDataGridCellValueElementProps) => {
      // https://github.com/elastic/eui/issues/5811
      const alert = alerts[_props.rowIndex - pagination.pageSize * pagination.pageIndex];
      const data: Array<{ field: string; value: string[] }> = [];
      Object.entries(alert ?? {}).forEach(([key, value]) => {
        data.push({ field: key, value });
      });
      return renderCellValue({
        ..._props,
        data,
      });
    },
    [alerts, pagination.pageIndex, pagination.pageSize, renderCellValue]
  );

  return (
    <section style={{ width: '100%' }} data-test-subj={props['data-test-subj']}>
      <Suspense fallback={null}>
        {flyoutAlertIndex > -1 && (
          <AlertsFlyout
            alert={alerts[flyoutAlertIndex]}
            alertsCount={alertsCount}
            onClose={handleFlyoutClose}
            alertsTableConfiguration={props.alertsTableConfiguration}
            flyoutIndex={flyoutAlertIndex + pagination.pageIndex * pagination.pageSize}
            onPaginate={onPaginateFlyout}
            isLoading={isLoading}
          />
        )}
      </Suspense>
      {alertsCount >= 0 && (
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
      )}
    </section>
  );
};

export { AlertsTable };
// eslint-disable-next-line import/no-default-export
export { AlertsTable as default };
