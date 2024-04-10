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
  EuiDataGridCellValueElementProps,
  EuiDataGridStyle,
  EuiSkeletonText,
  EuiDataGridRefProps,
  EuiFlexGroup,
  EuiDataGridProps,
  EuiDataGridCellPopoverElementProps,
  EuiCodeBlock,
  EuiText,
  EuiIcon,
  EuiSpacer,
  EuiFlexItem,
} from '@elastic/eui';
import { useQueryClient } from '@tanstack/react-query';
import styled from '@emotion/styled';
import { RuleRegistrySearchRequestPagination } from '@kbn/rule-registry-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useSorting, usePagination, useBulkActions, useActionsColumn } from './hooks';
import { AlertsTableProps, FetchAlertData } from '../../../types';
import { ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL } from './translations';

import './alerts_table.scss';
import { getToolbarVisibility } from './toolbar';
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

const basicRenderCellValue = ({
  data,
  columnId,
}: {
  data: Array<{ field: string; value: string[] }>;
  ecsData?: FetchAlertData['ecsAlertsData'][number];
  columnId: string;
}) => {
  const value = data.find((d) => d.field === columnId)?.value ?? [];
  if (Array.isArray(value)) {
    return <>{value.length ? value.join() : '--'}</>;
  }
  return <>{value}</>;
};

const isSystemCell = (columnId: string): columnId is SystemCellId => {
  return systemCells.includes(columnId as SystemCellId);
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

// Here we force the error callout to be the same height as the cell content
// so that the error detail gets hidden in the overflow area and only shown in
// the cell popover
const errorCalloutStyles = css`
  height: 1lh;
`;

/**
 * An error callout that displays the error stack in a code block
 */
const ViewError = ({ error }: { error: Error }) => (
  <>
    <EuiFlexGroup gutterSize="s" alignItems="center" css={errorCalloutStyles}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="error" color="danger" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText
          color="subdued"
          size="xs"
          css={css`
            line-height: unset;
          `}
        >
          <strong>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertTable.viewError"
              defaultMessage="An error occurred"
            />
          </strong>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer />
    <EuiCodeBlock isCopyable>{error.stack}</EuiCodeBlock>
  </>
);

const AlertsTable: React.FunctionComponent<AlertsTableProps> = (props: AlertsTableProps) => {
  const {
    visibleColumns,
    onToggleColumn,
    onResetColumns,
    updatedAt,
    browserFields,
    onChangeVisibleColumns,
    onColumnResize,
    showAlertStatusWithFlapping = false,
    showInspectButton = false,
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

  const {
    renderCustomActionsRow: CustomActionsRow,
    actionsColumnWidth,
    getSetIsActionLoadingCallback,
  } = useActionsColumn({
    options: props.alertsTableConfiguration.useActionsColumn,
  });
  const casesConfig = props.alertsTableConfiguration.cases;
  const renderCellContext = props.alertsTableConfiguration.useFetchPageContext?.({
    alerts,
    columns: props.columns,
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
    casesConfig,
    query: props.query,
    useBulkActionsConfig: props.alertsTableConfiguration.useBulkActions,
    refresh: alertsRefresh,
    featureIds: props.featureIds,
  });

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

  const fieldBrowserOptions = props.alertsTableConfiguration.useFieldBrowserOptions
    ? props.alertsTableConfiguration?.useFieldBrowserOptions({
        onToggleColumn,
      })
    : undefined;

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
      fieldBrowserOptions,
      getInspectQuery,
      showInspectButton,
      toolbarVisibilityProp: props.toolbarVisibility,
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
    fieldBrowserOptions,
    getInspectQuery,
    showInspectButton,
    props.toolbarVisibility,
  ])();

  const leadingControlColumns = useMemo(() => {
    let controlColumns = [...props.leadingControlColumns];

    if (CustomActionsRow) {
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

            if (!ecsAlertsData[visibleRowIndex]) {
              return null;
            }

            return (
              <EuiFlexGroup gutterSize="none" responsive={false} alignItems="center">
                <CustomActionsRow
                  id={props.id}
                  alert={alerts[visibleRowIndex]}
                  ecsAlert={ecsAlertsData[visibleRowIndex]}
                  nonEcsData={oldAlertsData[visibleRowIndex]}
                  rowIndex={visibleRowIndex}
                  setFlyoutAlert={handleFlyoutAlert}
                  setIsActionLoading={getSetIsActionLoadingCallback(visibleRowIndex)}
                  cveProps={cveProps}
                  refresh={refresh}
                  clearSelection={clearSelection}
                />
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
    props.leadingControlColumns,
    props.id,
    CustomActionsRow,
    isBulkActionsColumnActive,
    actionsColumnWidth,
    ecsAlertsData,
    alerts,
    oldAlertsData,
    handleFlyoutAlert,
    getSetIsActionLoadingCallback,
    refresh,
    clearSelection,
    getBulkActionsLeadingControlColumn,
  ]);

  useEffect(() => {
    // Row classes do not deal with visible row indices, so we need to handle page offset
    const rowIndex = flyoutAlertIndex + pagination.pageIndex * pagination.pageSize;
    setActiveRowClasses({
      [rowIndex]: 'alertsTableActiveRow',
    });
  }, [flyoutAlertIndex, pagination.pageIndex, pagination.pageSize]);

  // Update highlighted rows when alerts or pagination changes
  const highlightedRowClasses = useMemo(() => {
    let mappedRowClasses: EuiDataGridStyle['rowClasses'] = {};
    const shouldHighlightRowCheck = props.shouldHighlightRow;
    if (shouldHighlightRowCheck) {
      mappedRowClasses = alerts.reduce<NonNullable<EuiDataGridStyle['rowClasses']>>(
        (rowClasses, alert, index) => {
          if (shouldHighlightRowCheck(alert)) {
            rowClasses[index + pagination.pageIndex * pagination.pageSize] =
              'alertsTableHighlightedRow';
          }

          return rowClasses;
        },
        {}
      );
    }
    return mappedRowClasses;
  }, [props.shouldHighlightRow, alerts, pagination.pageIndex, pagination.pageSize]);

  const handleFlyoutClose = useCallback(() => setFlyoutAlertIndex(-1), [setFlyoutAlertIndex]);

  const renderCellValue = useCallback(
    () =>
      props.alertsTableConfiguration?.getRenderCellValue?.({
        setFlyoutAlert: handleFlyoutAlert,
        context: renderCellContext,
      }) ?? basicRenderCellValue,
    [handleFlyoutAlert, props.alertsTableConfiguration, renderCellContext]
  )();

  const handleRenderCellValue = useCallback(
    (_props: EuiDataGridCellValueElementProps) => {
      try {
        // https://github.com/elastic/eui/issues/5811
        const idx = _props.rowIndex - pagination.pageSize * pagination.pageIndex;
        const alert = alerts[idx];
        // ecsAlert is needed for security solution
        const ecsAlert = ecsAlertsData[idx];
        if (alert) {
          const data: Array<{ field: string; value: string[] }> = [];
          Object.entries(alert ?? {}).forEach(([key, value]) => {
            data.push({ field: key, value: value as string[] });
          });
          if (isSystemCell(_props.columnId)) {
            return (
              <SystemCellFactory
                alert={alert}
                columnId={_props.columnId}
                isLoading={isLoading || isLoadingCases || isLoadingMaintenanceWindows}
                cases={cases}
                maintenanceWindows={maintenanceWindows}
                showAlertStatusWithFlapping={showAlertStatusWithFlapping}
                caseAppId={casesConfig?.appId}
              />
            );
          }

          return renderCellValue({
            ..._props,
            data,
            ecsData: ecsAlert,
          });
        } else if (isLoading) {
          return <EuiSkeletonText lines={1} />;
        }
        return null;
      } catch (e) {
        return <ViewError error={e} />;
      }
    },
    [
      alerts,
      cases,
      casesConfig?.appId,
      ecsAlertsData,
      isLoading,
      isLoadingCases,
      isLoadingMaintenanceWindows,
      maintenanceWindows,
      pagination.pageIndex,
      pagination.pageSize,
      renderCellValue,
      showAlertStatusWithFlapping,
    ]
  );

  const renderCellPopover = useMemo(
    () =>
      props.alertsTableConfiguration?.getRenderCellPopover?.({
        context: renderCellContext,
      }) ?? props.renderCellPopover,
    [props.alertsTableConfiguration, props.renderCellPopover, renderCellContext]
  );

  const handleRenderCellPopover = useMemo(
    () =>
      renderCellPopover
        ? (_props: EuiDataGridCellPopoverElementProps) => {
            try {
              const idx = _props.rowIndex - pagination.pageSize * pagination.pageIndex;
              const alert = alerts[idx];
              if (alert) {
                return renderCellPopover({
                  ..._props,
                  alert,
                });
              }
              return null;
            } catch (e) {
              return <ViewError error={e} />;
            }
          }
        : undefined,
    [alerts, pagination.pageIndex, pagination.pageSize, renderCellPopover]
  );

  const dataGridPagination = useMemo(
    () => ({
      ...pagination,
      pageSizeOptions: props.pageSizeOptions,
      onChangeItemsPerPage: onChangePageSize,
      onChangePage: onChangePageIndex,
    }),
    [onChangePageIndex, onChangePageSize, pagination, props.pageSizeOptions]
  );

  const { getCellActions, visibleCellActions, disabledCellActions } = props.alertsTableConfiguration
    ?.useCellActions
    ? props.alertsTableConfiguration?.useCellActions({
        columns: props.columns,
        data: oldAlertsData,
        ecsData: ecsAlertsData,
        dataGridRef,
        pageSize: pagination.pageSize,
        pageIndex: pagination.pageIndex,
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

  // Merges the default grid style with the grid style that comes in through props.
  const actualGridStyle = useMemo(() => {
    const propGridStyle: NonNullable<EuiDataGridStyle> = props.gridStyle ?? {};
    // Merges default row classes, custom ones and adds the active row class style
    const mergedGridStyle: EuiDataGridStyle = {
      ...DefaultGridStyle,
      ...propGridStyle,
      rowClasses: {
        // We're spreadind the highlighted row classes first, so that the active
        // row classed can override the highlighted row classes.
        ...highlightedRowClasses,
        ...activeRowClasses,
      },
    };

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
  }, [activeRowClasses, highlightedRowClasses, props.gridStyle]);

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
            columnVisibility={{ visibleColumns, setVisibleColumns: onChangeVisibleColumns }}
            trailingControlColumns={props.trailingControlColumns}
            leadingControlColumns={leadingControlColumns}
            rowCount={alertsCount}
            renderCellValue={handleRenderCellValue}
            gridStyle={actualGridStyle}
            sorting={{ columns: sortingColumns, onSort }}
            toolbarVisibility={toolbarVisibility}
            pagination={dataGridPagination}
            rowHeightsOptions={props.rowHeightsOptions}
            onColumnResize={onColumnResize}
            ref={dataGridRef}
            renderCustomGridBody={props.dynamicRowHeight ? renderCustomGridBody : undefined}
            renderCellPopover={handleRenderCellPopover}
          />
        )}
      </section>
    </InspectButtonContainer>
  );
};

export { AlertsTable };
// eslint-disable-next-line import/no-default-export
export { AlertsTable as default };
