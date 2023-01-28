/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';
import React, { Suspense, lazy, useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiButtonIcon,
  EuiDataGridStyle,
  EuiLoadingContent,
  EuiDataGridRefProps,
} from '@elastic/eui';
import { useSorting, usePagination, useBulkActions, useActionsColumn } from './hooks';
import { AlertsTableProps } from '../../../types';
import {
  ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL,
  ALERTS_TABLE_CONTROL_COLUMNS_VIEW_DETAILS_LABEL,
} from './translations';

import './alerts_table.scss';
import { getToolbarVisibility } from './toolbar';

export const ACTIVE_ROW_CLASS = 'alertsTableActiveRow';

const AlertsFlyout = lazy(() => import('./alerts_flyout'));
const GridStyles: EuiDataGridStyle = {
  border: 'none',
  header: 'underline',
  fontSize: 's',
};

const AlertsTable: React.FunctionComponent<AlertsTableProps> = (props: AlertsTableProps) => {
  const dataGridRef = useRef<EuiDataGridRefProps>(null);
  const [_, setRowClasses] = useState<EuiDataGridStyle['rowClasses']>({});
  const alertsData = props.useFetchAlertsData();
  const {
    activePage,
    alerts,
    oldAlertsData,
    ecsAlertsData,
    alertsCount,
    isLoading,
    onPageChange,
    onSortChange,
    sort: sortingFields,
    refresh: alertsRefresh,
  } = alertsData;
  const { sortingColumns, onSort } = useSorting(onSortChange, sortingFields);

  const { renderCustomActionsRow, actionsColumnWidth, getSetIsActionLoadingCallback } =
    useActionsColumn({
      options: props.alertsTableConfiguration.useActionsColumn,
    });

  const {
    isBulkActionsColumnActive,
    getBulkActionsLeadingControlColumn,
    bulkActionsState,
    bulkActions,
    setIsBulkActionsLoading,
    clearSelection,
  } = useBulkActions({
    alerts,
    query: props.query,
    useBulkActionsConfig: props.alertsTableConfiguration.useBulkActions,
  });

  const refresh = useCallback(() => {
    alertsRefresh();
    clearSelection();
  }, [alertsRefresh, clearSelection]);

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

  const {
    visibleColumns,
    onToggleColumn,
    onResetColumns,
    updatedAt,
    browserFields,
    onChangeVisibleColumns,
  } = props;

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

  const toolbarVisibility = useCallback(() => {
    const { rowSelection } = bulkActionsState;
    return getToolbarVisibility({
      bulkActions,
      alertsCount,
      rowSelection,
      alerts: alertsData.alerts,
      updatedAt,
      isLoading,
      columnIds: visibleColumns,
      onToggleColumn,
      onResetColumns,
      browserFields,
      controls: props.controls,
      setIsBulkActionsLoading,
      clearSelection,
      refresh,
    });
  }, [
    bulkActionsState,
    bulkActions,
    alertsCount,
    alertsData.alerts,
    updatedAt,
    isLoading,
    visibleColumns,
    onToggleColumn,
    onResetColumns,
    browserFields,
    props.controls,
    setIsBulkActionsLoading,
    clearSelection,
    refresh,
  ])();

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
                {renderCustomActionsRow &&
                  ecsAlertsData[visibleRowIndex] &&
                  renderCustomActionsRow({
                    alert: alerts[visibleRowIndex],
                    ecsAlert: ecsAlertsData[visibleRowIndex],
                    nonEcsData: oldAlertsData[visibleRowIndex],
                    rowIndex: visibleRowIndex,
                    setFlyoutAlert: handleFlyoutAlert,
                    id: props.id,
                    cveProps,
                    setIsActionLoading: getSetIsActionLoadingCallback(visibleRowIndex),
                    refresh,
                    clearSelection,
                  })}
              </EuiFlexGroup>
            );
          },
        },
        ...controlColumns,
      ];
    }

    if (isBulkActionsColumnActive) {
      controlColumns = [getBulkActionsLeadingControlColumn(), ...controlColumns];
    }

    return controlColumns;
  }, [
    actionsColumnWidth,
    alerts,
    oldAlertsData,
    ecsAlertsData,
    getBulkActionsLeadingControlColumn,
    handleFlyoutAlert,
    isBulkActionsColumnActive,
    props.id,
    props.leadingControlColumns,
    props.showExpandToDetails,
    renderCustomActionsRow,
    setFlyoutAlertIndex,
    getSetIsActionLoadingCallback,
    refresh,
    clearSelection,
  ]);

  useEffect(() => {
    // Row classes do not deal with visible row indices, so we need to handle page offset
    const rowIndex = flyoutAlertIndex + pagination.pageIndex * pagination.pageSize;
    setRowClasses({
      [rowIndex]: ACTIVE_ROW_CLASS,
    });
  }, [flyoutAlertIndex, pagination.pageIndex, pagination.pageSize]);

  const handleFlyoutClose = useCallback(() => setFlyoutAlertIndex(-1), [setFlyoutAlertIndex]);

  const basicRenderCellValue = ({
    data,
    columnId,
    ecsData,
  }: {
    data: Array<{ field: string; value: string[] }>;
    columnId: string;
    ecsData?: unknown;
  }) => {
    const value = data.find((d) => d.field === columnId)?.value ?? [];
    if (Array.isArray(value)) {
      return <>{value.length ? value.join() : '--'}</>;
    }
    return <>{value}</>;
  };

  const renderCellValue = useCallback(
    () =>
      props.alertsTableConfiguration?.getRenderCellValue
        ? props.alertsTableConfiguration?.getRenderCellValue({
            setFlyoutAlert: handleFlyoutAlert,
          })
        : basicRenderCellValue,
    [handleFlyoutAlert, props.alertsTableConfiguration]
  );

  const handleRenderCellValue = useCallback(
    (_props: EuiDataGridCellValueElementProps) => {
      // https://github.com/elastic/eui/issues/5811
      const alertIndex = _props.rowIndex - pagination.pageSize * pagination.pageIndex;
      const data = oldAlertsData[alertIndex];
      const ecsAlert = ecsAlertsData[alertIndex];
      if (data) {
        try {
          return renderCellValue()({
            ..._props,
            data,
            ecsData: ecsAlert,
          });
        } catch {
          // TODO i118n
          return <>{'something went wrong'}</>;
        }
      } else if (isLoading) {
        return <EuiLoadingContent lines={1} />;
      }
      return null;
    },
    [
      ecsAlertsData,
      isLoading,
      oldAlertsData,
      pagination.pageIndex,
      pagination.pageSize,
      renderCellValue,
    ]
  );

  const { getCellActions, visibleCellActions, disabledCellActions } = props.alertsTableConfiguration
    ?.useCellActions
    ? props.alertsTableConfiguration?.useCellActions({
        columns: props.columns,
        data: oldAlertsData,
        ecsData: ecsAlertsData,
        dataGridRef: dataGridRef.current,
        pageSize: pagination.pageSize,
      })
    : { getCellActions: () => null, visibleCellActions: 2, disabledCellActions: [] };

  const columnsWithCellActions = useMemo(() => {
    if (getCellActions) {
      return props.columns.map((col) => ({
        ...col,
        ...(!(disabledCellActions ?? []).includes(col.id)
          ? {
              cellActions: getCellActions(col.id) ?? [],
              visibleCellActions,
            }
          : {}),
      }));
    }
    return props.columns;
  }, [getCellActions, disabledCellActions, props.columns, visibleCellActions]);

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
            id={props.id}
          />
        )}
      </Suspense>
      {alertsCount > 0 && (
        <EuiDataGrid
          aria-label="Alerts table"
          data-test-subj="alertsTable"
          columns={columnsWithCellActions}
          columnVisibility={{ visibleColumns, setVisibleColumns: onChangeVisibleColumns }}
          trailingControlColumns={props.trailingControlColumns}
          leadingControlColumns={leadingControlColumns}
          rowCount={alertsCount}
          renderCellValue={handleRenderCellValue}
          gridStyle={{ ...GridStyles, ...(props.gridStyle ?? {}) }}
          sorting={{ columns: sortingColumns, onSort }}
          toolbarVisibility={toolbarVisibility}
          pagination={{
            ...pagination,
            pageSizeOptions: props.pageSizeOptions,
            onChangeItemsPerPage: onChangePageSize,
            onChangePage: onChangePageIndex,
          }}
          rowHeightsOptions={props.rowHeightsOptions}
          ref={dataGridRef}
        />
      )}
    </section>
  );
};

export { AlertsTable };
// eslint-disable-next-line import/no-default-export
export { AlertsTable as default };
