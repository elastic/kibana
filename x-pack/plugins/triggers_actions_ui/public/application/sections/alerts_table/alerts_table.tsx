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
  useRef,
  memo,
} from 'react';
import {
  EuiDataGrid,
  EuiDataGridCellValueElementPropsWithContext,
  EuiDataGridStyle,
  EuiSkeletonText,
  EuiDataGridRefProps,
  EuiFlexGroup,
  EuiDataGridProps,
  RenderCellValueWithContext,
  EuiCodeBlock,
  EuiText,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';
import { useQueryClient } from '@tanstack/react-query';
import styled from '@emotion/styled';
import { RuleRegistrySearchRequestPagination } from '@kbn/rule-registry-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useSorting, usePagination, useBulkActions, useActionsColumn } from './hooks';
import type {
  AlertsTableProps,
  FetchAlertData,
  AlertsTableConfigurationRegistry,
} from '../../../types';
import { ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL } from './translations';

import './alerts_table.scss';
import { useGetToolbarVisibility } from './toolbar';
import { InspectButtonContainer } from './toolbar/components/inspect';
import { SystemCellId } from './types';
import { SystemCellFactory, systemCells } from './cells';
import { triggersActionsUiQueriesKeys } from '../../hooks/constants';
import { AlertsTableQueryContext } from './contexts/alerts_table_context';

const AlertsFlyout = lazy(() => import('./alerts_flyout'));
const DefaultGridStyle: EuiDataGridStyle = {
  border: 'none',
  header: 'underline',
  fontSize: 's',
};

const getCellActionsStub = {
  getCellActions: () => null,
  visibleCellActions: undefined,
  disabledCellActions: [],
};

const fieldBrowserStub = () => ({});
const stableMappedRowClasses: EuiDataGridStyle['rowClasses'] = {};

interface BasicRenderProps {
  data?: Array<{ field: string; value: string[] }>;
  ecsData?: FetchAlertData['ecsAlertsData'][number];
  columnId: string;
}

const BasicRenderCellValue: RenderCellValueWithContext = memo(
  ({ data, columnId }: EuiDataGridCellValueElementPropsWithContext<BasicRenderProps>) => {
    const value = (Array.isArray(data) && data.find((d) => d.field === columnId)?.value) ?? [];
    if (Array.isArray(value)) {
      return <>{value.length ? value.join() : '--'}</>;
    }
    return <>{value}</>;
  }
);

const FullFeaturedRenderCellValue: RenderCellValueWithContext = memo((props) => {
  const {
    columnId,
    cases,
    maintenanceWindows,
    showAlertStatusWithFlapping,
    isLoading,
    isLoadingCases,
    isLoadingMaintenanceWindows,
    casesConfig,
    rowIndex,
    pagination,
    RenderCell,
    ecsData,
    alerts,
  } = props;
  const idx = rowIndex - pagination.pageSize * pagination.pageIndex;
  const alert = alerts[idx];
  // ecsAlert is needed for security solution
  const ecsAlert = ecsData[idx];
  if (alert) {
    const data: Array<{ field: string; value: string[] }> = [];
    Object.entries(alert ?? {}).forEach(([key, value]) => {
      data.push({ field: key, value: value as string[] });
    });
    if (isSystemCell(columnId)) {
      return (
        <SystemCellFactory
          alert={alert}
          columnId={columnId}
          isLoading={isLoading || isLoadingCases || isLoadingMaintenanceWindows}
          cases={cases}
          maintenanceWindows={maintenanceWindows}
          showAlertStatusWithFlapping={showAlertStatusWithFlapping}
          caseAppId={casesConfig?.appId}
        />
      );
    } else {
      return <RenderCell {...props} data={data} ecsData={ecsAlert} />;
    }
  } else if (isLoading) {
    return <EuiSkeletonText lines={1} />;
  }
  return null;
});

const ControlColumnHeaderRenderCell = memo(() => {
  return (
    <span data-test-subj="expandColumnHeaderLabel">
      {ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL}
    </span>
  );
});

const ControlColumnRowRenderCell = memo(
  (props: EuiDataGridCellValueElementPropsWithContext<any>) => {
    const {
      visibleRowIndex,
      alerts,
      ecsData,
      setFlyoutAlert,
      oldAlertsData,
      id,
      getSetIsActionLoadingCallback,
      refresh,
      clearSelection,
      renderCustomActionsRow,
    } = props;
    if (!ecsData[visibleRowIndex]) {
      return null;
    }

    return (
      <EuiFlexGroup gutterSize="none" responsive={false}>
        {renderCustomActionsRow({
          alert: alerts[visibleRowIndex],
          ecsAlert: ecsData[visibleRowIndex],
          nonEcsData: oldAlertsData[visibleRowIndex],
          rowIndex: visibleRowIndex,
          setFlyoutAlert,
          id,
          cveProps: props,
          setIsActionLoading: getSetIsActionLoadingCallback(visibleRowIndex),
          refresh,
          clearSelection,
        })}
      </EuiFlexGroup>
    );
  }
);

const isSystemCell = (columnId: string): columnId is SystemCellId => {
  return systemCells.includes(columnId as SystemCellId);
};

const useFieldBrowserOptionsOrDefault = (
  useFieldBrowserOptions:
    | NonNullable<AlertsTableConfigurationRegistry['useFieldBrowserOptions']>
    | (() => undefined),
  onToggleColumn: (columnId: string) => void
) => {
  const args = useMemo(() => ({ onToggleColumn }), [onToggleColumn]);
  return useFieldBrowserOptions(args);
};

const Row = styled.div`
  display: flex;
  min-width: fit-content;
`;

type CustomGridBodyProps = Pick<
  Parameters<NonNullable<EuiDataGridProps['renderCustomGridBody']>>['0'],
  'Cell' | 'visibleColumns'
> & {
  alertsData: FetchAlertData['oldAlertsData'];
  isLoading: boolean;
  pagination: RuleRegistrySearchRequestPagination;
  actualGridStyle: EuiDataGridStyle;
  stripes?: boolean;
};

const CustomGridBody = memo(
  ({
    alertsData,
    isLoading,
    pagination,
    actualGridStyle,
    visibleColumns,
    Cell,
    stripes,
  }: CustomGridBodyProps) => {
    return (
      <>
        {alertsData
          .concat(isLoading ? Array.from({ length: pagination.pageSize - alertsData.length }) : [])
          .map((_row, rowIndex) => (
            <Row
              role="row"
              key={`${rowIndex},${pagination.pageIndex}`}
              // manually add stripes if props.gridStyle.stripes is true because presence of rowClasses
              // overrides the props.gridStyle.stripes option. And rowClasses will always be there.
              // Adding stripes only on even rows. It will be replaced by alertsTableHighlightedRow if
              // shouldHighlightRow is correct
              className={`euiDataGridRow ${
                stripes && rowIndex % 2 !== 0 ? 'euiDataGridRow--striped' : ''
              } ${actualGridStyle.rowClasses?.[rowIndex] ?? ''}`}
            >
              {visibleColumns.map((_col, colIndex) => (
                <Cell
                  colIndex={colIndex}
                  visibleRowIndex={rowIndex}
                  key={`${rowIndex},${colIndex}`}
                />
              ))}
            </Row>
          ))}
      </>
    );
  }
);

const AlertsTable: React.FunctionComponent<AlertsTableProps> = memo((props: AlertsTableProps) => {
  const {
    visibleColumns,
    onToggleColumn,
    onResetColumns,
    browserFields,
    onChangeVisibleColumns,
    onColumnResize,
    showAlertStatusWithFlapping = false,
    showInspectButton = false,
    renderCellContext: passedRenderCellContext,
    // renderCellValue,
    leadingControlColumns: passedControlColumns,
    alertsTableConfiguration,
  } = props;

  const dataGridRef = useRef<EuiDataGridRefProps>(null);
  const [activeRowClasses, setActiveRowClasses] = useState<
    NonNullable<EuiDataGridStyle['rowClasses']>
  >({});
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
    getInspectQuery,
  } = alertsData;

  const queryClient = useQueryClient({ context: AlertsTableQueryContext });
  const { data: cases, isLoading: isLoadingCases } = props.cases;
  const { data: maintenanceWindows, isLoading: isLoadingMaintenanceWindows } =
    props.maintenanceWindows;

  const { sortingColumns, onSort } = useSorting(onSortChange, visibleColumns, sortingFields);

  const { renderCustomActionsRow, actionsColumnWidth, getSetIsActionLoadingCallback } =
    useActionsColumn({
      options: props.alertsTableConfiguration.useActionsColumn,
    });
  const casesConfig = props.alertsTableConfiguration.cases;
  const userAssigneeContext = props.alertsTableConfiguration.useFetchPageContext?.({
    alerts,
    columns: props.columns,
  });

  const bulkActionArgs = useMemo(() => {
    return {
      alerts,
      casesConfig: props.alertsTableConfiguration.cases,
      query: props.query,
      useBulkActionsConfig: props.alertsTableConfiguration.useBulkActions,
      refresh: alertsRefresh,
      featureIds: props.featureIds,
    };
  }, [alerts, props.alertsTableConfiguration, props.query, alertsRefresh, props.featureIds]);

  const {
    isBulkActionsColumnActive,
    getBulkActionsLeadingControlColumn,
    bulkActionsState,
    bulkActions,
    setIsBulkActionsLoading,
    clearSelection,
  } = useBulkActions(bulkActionArgs);

  const refreshData = useCallback(() => {
    alertsRefresh();
    queryClient.invalidateQueries(triggersActionsUiQueriesKeys.cases());
    queryClient.invalidateQueries(triggersActionsUiQueriesKeys.mutedAlerts());
    queryClient.invalidateQueries(triggersActionsUiQueriesKeys.maintenanceWindows());
  }, [alertsRefresh, queryClient]);

  const refresh = useCallback(() => {
    refreshData();
    clearSelection();
  }, [clearSelection, refreshData]);

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

  // TODO when every solution is using this table, we will be able to simplify it by just passing the alert index
  const handleFlyoutAlert = useCallback(
    (alertId: string) => {
      const idx = alerts.findIndex((a) => (a as any)[ALERT_UUID].includes(alertId));
      setFlyoutAlertIndex(idx);
    },
    [alerts, setFlyoutAlertIndex]
  );

  const fieldBrowserOptions = useFieldBrowserOptionsOrDefault(
    alertsTableConfiguration.useFieldBrowserOptions ?? fieldBrowserStub,
    onToggleColumn
  );
  const toolbarVisibilityProps = useMemo(() => {
    return {
      bulkActions,
      alertsCount,
      rowSelection: bulkActionsState.rowSelection,
      alerts: alertsData.alerts,
      isLoading,
      columnIds: visibleColumns,
      onToggleColumn,
      onResetColumns,
      browserFields,
      controls: props.controls,
      setIsBulkActionsLoading,
      clearSelection,
      refresh,
      fieldBrowserOptions,
      getInspectQuery,
      showInspectButton,
      toolbarVisiblityProp: props.toolbarVisibility,
    };
  }, [
    bulkActions,
    alertsCount,
    bulkActionsState,
    alertsData,
    isLoading,
    visibleColumns,
    onToggleColumn,
    onResetColumns,
    browserFields,
    props.controls,
    setIsBulkActionsLoading,
    clearSelection,
    refresh,
    fieldBrowserOptions,
    getInspectQuery,
    showInspectButton,
    props.toolbarVisibility,
  ]);

  const toolbarVisibility = useGetToolbarVisibility(toolbarVisibilityProps);
  const customActionsRow = useMemo(() => {
    return renderCustomActionsRow
      ? {
          id: 'customActions',
          width: actionsColumnWidth,
          headerCellRender: ControlColumnHeaderRenderCell,
          rowCellRender: ControlColumnRowRenderCell,
        }
      : undefined;
  }, [renderCustomActionsRow, actionsColumnWidth]);
  const bulkActionsColumn = useMemo(() => {
    return isBulkActionsColumnActive ? getBulkActionsLeadingControlColumn() : undefined;
  }, [isBulkActionsColumnActive, getBulkActionsLeadingControlColumn]);
  const leadingControlColumns = useMemo(() => {
    const controlColumns = passedControlColumns ?? [];
    if (bulkActionsColumn) {
      controlColumns.push(bulkActionsColumn);
    }
    if (customActionsRow) {
      controlColumns.push(customActionsRow);
    }
    return controlColumns;
  }, [bulkActionsColumn, customActionsRow, passedControlColumns]);

  const rowIndex = flyoutAlertIndex + pagination.pageIndex * pagination.pageSize;
  useEffect(() => {
    // Row classes do not deal with visible row indices, so we need to handle page offset
    setActiveRowClasses({
      [rowIndex]: 'alertsTableActiveRow',
    });
  }, [rowIndex]);

  const handleFlyoutClose = useCallback(() => setFlyoutAlertIndex(-1), [setFlyoutAlertIndex]);

  const RenderCell = useMemo(() => {
    if (props.alertsTableConfiguration?.getRenderCellValue) {
      return props.alertsTableConfiguration.getRenderCellValue;
    } else {
      return BasicRenderCellValue;
    }
  }, [props.alertsTableConfiguration]);

  const renderCellContext = useCallback(() => {
    const additionalContext = passedRenderCellContext ? passedRenderCellContext() : {};
    return {
      ...additionalContext,
      ecsData: ecsAlertsData,
      oldAlertsData,
      context: userAssigneeContext,
      alerts,
      browserFields,
      pagination,
      isLoading,
      setFlyoutAlert: handleFlyoutAlert,
      RenderCell,
      isLoadingCases,
      isLoadingMaintenanceWindows,
      getSetIsActionLoadingCallback,
      cases,
      maintenanceWindows,
      showAlertStatusWithFlapping,
      refresh,
      clearSelection,
      renderCustomActionsRow,
      'test-test-custom-attribute': 'ello cool api',
    };
  }, [
    passedRenderCellContext,
    ecsAlertsData,
    oldAlertsData,
    refresh,
    clearSelection,
    renderCustomActionsRow,
    handleFlyoutAlert,
    RenderCell,
    browserFields,
    isLoading,
    pagination,
    alerts,
    isLoadingCases,
    isLoadingMaintenanceWindows,
    cases,
    maintenanceWindows,
    showAlertStatusWithFlapping,
    getSetIsActionLoadingCallback,
    userAssigneeContext,
  ]);

  const dataGridPagination = useMemo(
    () => ({
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      pageSizeOptions: props.pageSizeOptions,
      onChangeItemsPerPage: onChangePageSize,
      onChangePage: onChangePageIndex,
    }),
    [
      onChangePageIndex,
      onChangePageSize,
      pagination.pageIndex,
      pagination.pageSize,
      props.pageSizeOptions,
    ]
  );

  const { getCellActions, visibleCellActions, disabledCellActions } = props.alertsTableConfiguration
    ?.useCellActions
    ? props.alertsTableConfiguration?.useCellActions({
        columns: props.columns,
        data: oldAlertsData,
        ecsData: ecsAlertsData,
        dataGridRef,
        pageSize: pagination.pageSize,
      })
    : getCellActionsStub;

  const columnsWithCellActions = useMemo(() => {
    if (getCellActions) {
      return props.columns.map((col, idx) => ({
        ...col,
        ...(!(disabledCellActions ?? []).includes(col.id)
          ? {
              cellActions: getCellActions(col.id, idx) ?? [],
              visibleCellActions,
            }
          : {}),
      }));
    }
    return props.columns;
  }, [getCellActions, disabledCellActions, props.columns, visibleCellActions]);

  // // Update highlighted rows when alerts or pagination changes
  const highlightedRowClasses = useMemo(() => {
    const shouldHighlightRowCheck = props.shouldHighlightRow;
    if (shouldHighlightRowCheck) {
      return alerts.reduce<NonNullable<EuiDataGridStyle['rowClasses']>>(
        (rowClasses, alert, index) => {
          if (shouldHighlightRowCheck(alert)) {
            rowClasses[index + pagination.pageIndex * pagination.pageSize] =
              'alertsTableHighlightedRow';
          }

          return rowClasses;
        },
        {}
      );
    } else {
      return stableMappedRowClasses;
    }
  }, [props.shouldHighlightRow, alerts, pagination.pageIndex, pagination.pageSize]);

  const mergedGridStyle = useMemo(() => {
    const propGridStyle: NonNullable<EuiDataGridStyle> = props.gridStyle ?? {};
    // Merges default row classes, custom ones and adds the active row class style
    return {
      ...DefaultGridStyle,
      ...propGridStyle,
      rowClasses: {
        // We're spreadind the highlighted row classes first, so that the active
        // row classed can override the highlighted row classes.
        ...highlightedRowClasses,
        ...activeRowClasses,
      },
    };
  }, [activeRowClasses, highlightedRowClasses, props.gridStyle]);

  // Merges the default grid style with the grid style that comes in through props.
  const actualGridStyle = useMemo(() => {
    const propGridStyle: NonNullable<EuiDataGridStyle> = props.gridStyle ?? {};
    // If ANY additional rowClasses have been provided, we need to merge them with our internal ones
    if (propGridStyle.rowClasses) {
      // Get all row indices with a rowClass.
      const mergedKeys = [
        ...Object.keys(mergedGridStyle.rowClasses || {}),
        ...Object.keys(propGridStyle.rowClasses || {}),
      ];
      // Deduplicate keys to avoid extra iterations
      const dedupedKeys = Array.from(new Set(mergedKeys));

      // For each index, merge row classes
      const mergedRowClasses = dedupedKeys.reduce<NonNullable<EuiDataGridStyle['rowClasses']>>(
        (rowClasses, key) => {
          const intKey = parseInt(key, 10);
          // Use internal row classes over custom row classes.
          rowClasses[intKey] =
            mergedGridStyle.rowClasses?.[intKey] || propGridStyle.rowClasses?.[intKey] || '';
          return rowClasses;
        },
        {}
      );
      mergedGridStyle.rowClasses = mergedRowClasses;
    }
    return mergedGridStyle;
  }, [props.gridStyle, mergedGridStyle]);

  const renderCustomGridBody = useCallback<NonNullable<EuiDataGridProps['renderCustomGridBody']>>(
    ({ visibleColumns: _visibleColumns, Cell }) => (
      <CustomGridBody
        visibleColumns={_visibleColumns}
        Cell={Cell}
        actualGridStyle={actualGridStyle}
        alertsData={oldAlertsData}
        pagination={pagination}
        isLoading={isLoading}
        stripes={props.gridStyle?.stripes}
      />
    ),
    [actualGridStyle, oldAlertsData, pagination, isLoading, props.gridStyle?.stripes]
  );

  const sortProps = useMemo(() => {
    return { columns: sortingColumns, onSort };
  }, [sortingColumns, onSort]);

  const columnVisibility = useMemo(() => {
    return { visibleColumns, setVisibleColumns: onChangeVisibleColumns };
  }, [visibleColumns, onChangeVisibleColumns]);

  return (
    <InspectButtonContainer>
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
            columnVisibility={columnVisibility}
            trailingControlColumns={props.trailingControlColumns}
            leadingControlColumns={leadingControlColumns}
            rowCount={alertsCount}
            renderCellValue={FullFeaturedRenderCellValue}
            gridStyle={actualGridStyle}
            sorting={sortProps}
            toolbarVisibility={toolbarVisibility}
            renderCellContext={renderCellContext}
            pagination={dataGridPagination}
            rowHeightsOptions={props.rowHeightsOptions}
            onColumnResize={onColumnResize}
            ref={dataGridRef}
            renderCustomGridBody={props.dynamicRowHeight ? renderCustomGridBody : undefined}
          />
        )}
      </section>
    </InspectButtonContainer>
  );
});

AlertsTable.displayName = 'AlertsTable';

export { AlertsTable };
// eslint-disable-next-line import/no-default-export
export { AlertsTable as default };
