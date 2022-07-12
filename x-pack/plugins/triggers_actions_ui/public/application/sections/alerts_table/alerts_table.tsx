/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';
import React, {
  useState,
  Suspense,
  lazy,
  useCallback,
  useMemo,
  useEffect,
  useContext,
} from 'react';
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
import { getLeadingControlColumn as getBulkActionsLeadingControlColumn } from './bulk_actions/leading_control_column';

import './alerts_table.scss';
import { getToolbarVisibility } from './toolbar';
import { BulkActionsContext } from './bulk_actions/context';

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
  const alertsData = props.useFetchAlertsData();
  const {
    activePage,
    alerts,
    alertsCount,
    isLoading,
    onColumnsChange,
    onPageChange,
    onSortChange,
    sort: sortingFields,
  } = alertsData;
  const { sortingColumns, onSort } = useSorting(onSortChange, sortingFields);

  const {
    useActionsColumn = () => ({ renderCustomActionsRow: undefined, width: undefined }),
    useBulkActions = () => ({ render: undefined }),
  } = props.alertsTableConfiguration;
  const { renderCustomActionsRow, width: actionsColumnWidth = DEFAULT_ACTIONS_COLUMNS_WIDTH } =
    useActionsColumn();

  const [bulkActionsState, updateBulkActionsState] = useContext(BulkActionsContext);
  const { render: renderBulkActions } = useBulkActions();

  const isBulkActionsColumnActive = Boolean(renderBulkActions);

  useEffect(() => {
    updateBulkActionsState({ action: 'rowCountUpdate', rowCount: alerts.length });
  }, [alerts, updateBulkActionsState]);

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

  const leadingControlColumns = useMemo(() => {
    const isActionButtonsColumnActive =
      props.showExpandToDetails || Boolean(renderCustomActionsRow);

    let controlColumns = [...props.leadingControlColumns];

    if (isActionButtonsColumnActive) {
      controlColumns = [
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
                {renderCustomActionsRow && renderCustomActionsRow(alerts[visibleRowIndex])}
              </EuiFlexGroup>
            );
          },
        },
        ...controlColumns,
      ];
    }

    if (isBulkActionsColumnActive) {
      controlColumns = [
        getBulkActionsLeadingControlColumn({ pageSize: pagination.pageSize }),
        ...controlColumns,
      ];
    }

    return controlColumns;
  }, [
    actionsColumnWidth,
    alerts,
    isBulkActionsColumnActive,
    pagination.pageSize,
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

  const toolbarVisibility = useCallback(() => {
    const { rowSelection, isAllSelected } = bulkActionsState;
    return getToolbarVisibility({
      renderBulkActions,
      alertsCount,
      rowSelection,
      isAllSelected,
      alerts: alertsData.alerts,
    });
  }, [alertsCount, alertsData.alerts, renderBulkActions, bulkActionsState])();

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
          toolbarVisibility={toolbarVisibility}
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
