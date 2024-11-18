/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  ComponentProps,
  FC,
  lazy,
  memo,
  PropsWithChildren,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  EuiCodeBlock,
  EuiDataGrid,
  EuiDataGridControlColumn,
  EuiDataGridProps,
  EuiDataGridStyle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  RenderCellValue,
  tint,
  useEuiTheme,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { EuiDataGridCellPopoverElementProps } from '@elastic/eui/src/components/datagrid/data_grid_types';
import { euiThemeVars } from '@kbn/ui-theme';
import { BulkActionsCell } from './bulk_actions/components/row_cell';
import { BulkActionsHeader } from './bulk_actions/components';
import { useAlertsTableContext } from './contexts/alerts_table_context';
import { useBulkActions, useSorting } from './hooks';
import {
  AdditionalContext,
  Alert,
  AlertsDataGridProps,
  AlertsTableProps,
  BulkActionsVerbs,
  CellActionsOptions,
  FetchAlertData,
} from '../../../types';
import { ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL } from './translations';
import { useGetToolbarVisibility } from './toolbar';
import { InspectButtonContainer } from './toolbar/components/inspect';
import { SystemCellId } from './types';
import { SystemCellFactory, systemCells } from './cells';
import { typedMemo } from './utils';
import type { AlertsFlyout as AlertsFlyoutType } from './alerts_flyout/alerts_flyout';
import { ErrorBoundary } from '../common/components/error_boundary';

const AlertsFlyout = lazy(() => import('./alerts_flyout')) as typeof AlertsFlyoutType;

const DefaultGridStyle: EuiDataGridStyle = {
  border: 'none',
  header: 'underline',
  fontSize: 's',
};

const defaultCellActionsOptions: CellActionsOptions = {
  getCellActionsForColumn: () => [],
  disabledCellActions: [],
};
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_ACTIONS_COLUMNS_WIDTH = 75;

const stableMappedRowClasses: EuiDataGridStyle['rowClasses'] = {};

interface BasicCellValueProps {
  columnId: string;
  alert: Alert;
}

const BasicCellValue = memo(({ alert, columnId }: BasicCellValueProps) => {
  const value = alert[columnId];
  if (Array.isArray(value)) {
    return <>{value.length ? value.join() : '--'}</>;
  }
  return <>{value}</>;
});

const ControlColumnHeaderRenderCell = memo(() => {
  return (
    <span data-test-subj="expandColumnHeaderLabel">
      {ALERTS_TABLE_CONTROL_COLUMNS_ACTIONS_LABEL}
    </span>
  );
});

const CustomCellWrapper = ({ children }: PropsWithChildren) => (
  <EuiFlexGroup gutterSize="none" responsive={false}>
    {children}
  </EuiFlexGroup>
);

const isSystemCell = (columnId: string): columnId is SystemCellId => {
  return systemCells.includes(columnId as SystemCellId);
};

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
  pageIndex: number;
  pageSize: number;
  actualGridStyle: EuiDataGridStyle;
  stripes?: boolean;
};

const CustomGridBody = memo(
  ({
    alertsData,
    isLoading,
    pageIndex,
    pageSize,
    actualGridStyle,
    visibleColumns,
    Cell,
    stripes,
  }: CustomGridBodyProps) => {
    return (
      <>
        {alertsData
          .concat(isLoading ? Array.from({ length: pageSize - alertsData.length }) : [])
          .map((_row, rowIndex) => (
            <Row
              role="row"
              key={`${rowIndex},${pageIndex}`}
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

const CellValueHost: AlertsTableProps['renderCellValue'] = (props) => {
  const {
    columnId,
    renderCellValue: CellValue,
    isLoading,
    alerts,
    oldAlertsData,
    ecsAlertsData,
    cases,
    maintenanceWindows,
    showAlertStatusWithFlapping,
    casesConfig,
    rowIndex,
    pageIndex,
    pageSize,
  } = props;
  const idx = rowIndex - pageSize * pageIndex;
  const alert = alerts[idx];
  const legacyAlert = oldAlertsData[idx];
  const ecsAlert = ecsAlertsData[idx];
  if (isSystemCell(columnId)) {
    return (
      <SystemCellFactory
        {...props}
        alert={alert}
        columnId={columnId}
        isLoading={isLoading}
        cases={cases}
        maintenanceWindows={maintenanceWindows}
        showAlertStatusWithFlapping={showAlertStatusWithFlapping ?? false}
        caseAppId={casesConfig?.appId}
      />
    );
  } else if (alert) {
    if (CellValue) {
      return (
        <ErrorBoundary fallback={ViewError}>
          <CellValue {...props} alert={alert} legacyAlert={legacyAlert} ecsAlert={ecsAlert} />
        </ErrorBoundary>
      );
    } else {
      return <BasicCellValue alert={alert} columnId={columnId} />;
    }
  } else if (isLoading) {
    return <EuiSkeletonText lines={1} />;
  }
  return null;
};

const CellPopoverHost = (props: EuiDataGridCellPopoverElementProps) => {
  const { rowIndex, DefaultCellPopover } = props;
  const renderContext = useAlertsTableContext();
  const { pageSize, pageIndex, alerts, renderCellPopover: CellPopover } = renderContext;

  const idx = rowIndex - pageSize * pageIndex;
  const alert = alerts[idx];
  if (alert && CellPopover) {
    return (
      <ErrorBoundary fallback={ViewError}>
        <CellPopover {...renderContext} {...props} alert={alert} />
      </ErrorBoundary>
    );
  }

  return <DefaultCellPopover {...props} />;
};

export const AlertsDataGrid = typedMemo(
  <AC extends AdditionalContext>(props: AlertsDataGridProps<AC>) => {
    const {
      featureIds,
      query,
      visibleColumns,
      onToggleColumn,
      onResetColumns,
      onChangeVisibleColumns,
      onColumnResize,
      showInspectButton = false,
      leadingControlColumns: additionalLeadingControlColumns,
      trailingControlColumns,
      onSortChange,
      sort: sortingFields,
      rowHeightsOptions,
      dynamicRowHeight,
      alertsQuerySnapshot,
      additionalToolbarControls,
      toolbarVisibility: toolbarVisibilityProp,
      shouldHighlightRow,
      renderContext,
      hideBulkActions,
      casesConfiguration,
      flyoutAlertIndex,
      setFlyoutAlertIndex,
      onPaginateFlyout,
      onChangePageSize,
      onChangePageIndex,
      actionsColumnWidth = DEFAULT_ACTIONS_COLUMNS_WIDTH,
      getBulkActions,
      fieldsBrowserOptions,
      cellActionsOptions,
      pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
      height,
      ...euiDataGridProps
    } = props;
    const {
      isLoading,
      alerts,
      alertsCount,
      isLoadingAlerts,
      oldAlertsData,
      browserFields,
      renderActionsCell: ActionsCell,
      pageIndex,
      pageSize,
      refresh: refreshQueries,
      columns,
      dataGridRef,
    } = renderContext;

    const { colorMode } = useEuiTheme();

    const [activeRowClasses, setActiveRowClasses] = useState<
      NonNullable<EuiDataGridStyle['rowClasses']>
    >({});

    const { sortingColumns, onSort } = useSorting(onSortChange, visibleColumns, sortingFields);

    const bulkActionArgs = useMemo(
      () => ({
        featureIds,
        query,
        alertsCount: alerts.length,
        casesConfig: casesConfiguration,
        getBulkActions,
        refresh: refreshQueries,
        hideBulkActions,
      }),
      [
        featureIds,
        query,
        alerts.length,
        casesConfiguration,
        getBulkActions,
        refreshQueries,
        hideBulkActions,
      ]
    );

    const {
      isBulkActionsColumnActive,
      bulkActionsState,
      bulkActions,
      setIsBulkActionsLoading,
      clearSelection,
      updateBulkActionsState,
    } = useBulkActions(bulkActionArgs);

    const refresh = useCallback(() => {
      refreshQueries();
      clearSelection();
    }, [clearSelection, refreshQueries]);

    const toolbarVisibilityArgs = useMemo(() => {
      return {
        bulkActions,
        alertsCount,
        rowSelection: bulkActionsState.rowSelection,
        alerts,
        isLoading,
        columnIds: columns.map((column) => column.id),
        onToggleColumn,
        onResetColumns,
        browserFields,
        additionalToolbarControls,
        setIsBulkActionsLoading,
        clearSelection,
        refresh,
        fieldsBrowserOptions,
        alertsQuerySnapshot,
        showInspectButton,
        toolbarVisibilityProp,
      };
    }, [
      bulkActions,
      alertsCount,
      bulkActionsState.rowSelection,
      alerts,
      isLoading,
      columns,
      onToggleColumn,
      onResetColumns,
      browserFields,
      additionalToolbarControls,
      setIsBulkActionsLoading,
      clearSelection,
      refresh,
      fieldsBrowserOptions,
      alertsQuerySnapshot,
      showInspectButton,
      toolbarVisibilityProp,
    ]);

    const toolbarVisibility = useGetToolbarVisibility(toolbarVisibilityArgs);

    const customActionsColumn: EuiDataGridControlColumn | undefined = useMemo(() => {
      if (ActionsCell) {
        const RowCellRender: EuiDataGridControlColumn['rowCellRender'] = (_props) => {
          const idx = _props.rowIndex - _props.pageSize * _props.pageIndex;
          const alert = _props.alerts[idx];
          const legacyAlert = _props.oldAlertsData[idx];
          const ecsAlert = _props.ecsAlertsData[idx];
          const setIsActionLoading = useCallback(
            (_isLoading: boolean = true) => {
              updateBulkActionsState({
                action: BulkActionsVerbs.updateRowLoadingState,
                rowIndex: _props.visibleRowIndex,
                isLoading: _isLoading,
              });
            },
            [_props.visibleRowIndex]
          );

          if (!alert) {
            return null;
          }

          return (
            <CustomCellWrapper>
              <ActionsCell
                {...(_props as ComponentProps<
                  // `_props` already contains the correct render context
                  typeof ActionsCell
                >)}
                alert={alert}
                legacyAlert={legacyAlert}
                ecsAlert={ecsAlert}
                setIsActionLoading={setIsActionLoading}
              />
            </CustomCellWrapper>
          );
        };
        return {
          id: 'expandColumn',
          width: actionsColumnWidth,
          headerCellRender: ControlColumnHeaderRenderCell,
          rowCellRender: RowCellRender,
        };
      }
    }, [ActionsCell, actionsColumnWidth, updateBulkActionsState]);

    const leadingControlColumns: EuiDataGridControlColumn[] | undefined = useMemo(() => {
      const controlColumns = [
        ...(additionalLeadingControlColumns ?? []),
        ...(isBulkActionsColumnActive
          ? [
              {
                id: 'bulkActions',
                width: 30,
                headerCellRender: BulkActionsHeader,
                rowCellRender: BulkActionsCell,
              },
            ]
          : []),
        ...(customActionsColumn ? [customActionsColumn] : []),
      ];
      if (controlColumns.length) {
        return controlColumns;
      }
    }, [additionalLeadingControlColumns, isBulkActionsColumnActive, customActionsColumn]);

    const flyoutRowIndex = flyoutAlertIndex + pageIndex * pageSize;
    useEffect(() => {
      // Row classes do not deal with visible row indices, so we need to handle page offset
      setActiveRowClasses({
        [flyoutRowIndex]: 'alertsTableActiveRow',
      });
    }, [flyoutRowIndex]);

    const handleFlyoutClose = useCallback(() => setFlyoutAlertIndex(-1), [setFlyoutAlertIndex]);

    const dataGridPagination = useMemo(
      () => ({
        pageIndex,
        pageSize,
        pageSizeOptions,
        onChangeItemsPerPage: onChangePageSize,
        onChangePage: onChangePageIndex,
      }),
      [onChangePageIndex, onChangePageSize, pageIndex, pageSize, pageSizeOptions]
    );

    const { getCellActionsForColumn, visibleCellActions, disabledCellActions } =
      cellActionsOptions ?? defaultCellActionsOptions;

    const columnsWithCellActions = useMemo(() => {
      if (getCellActionsForColumn) {
        return columns.map((col, idx) => ({
          ...col,
          ...(!(disabledCellActions ?? []).includes(col.id)
            ? {
                cellActions: getCellActionsForColumn(col.id, idx) ?? [],
                visibleCellActions,
              }
            : {}),
        }));
      }
      return columns;
    }, [getCellActionsForColumn, columns, disabledCellActions, visibleCellActions]);

    // Update highlighted rows when alerts or pagination changes
    const highlightedRowClasses = useMemo(() => {
      if (shouldHighlightRow) {
        const emptyShouldHighlightRow: EuiDataGridStyle['rowClasses'] = {};
        return alerts.reduce<NonNullable<EuiDataGridStyle['rowClasses']>>(
          (rowClasses, alert, index) => {
            if (shouldHighlightRow(alert)) {
              rowClasses[index + pageIndex * pageSize] = 'alertsTableHighlightedRow';
            }

            return rowClasses;
          },
          emptyShouldHighlightRow
        );
      } else {
        return stableMappedRowClasses;
      }
    }, [shouldHighlightRow, alerts, pageIndex, pageSize]);

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
        mergedGridStyle.rowClasses = dedupedKeys.reduce<
          NonNullable<EuiDataGridStyle['rowClasses']>
        >((rowClasses, key) => {
          const intKey = parseInt(key, 10);
          // Use internal row classes over custom row classes.
          rowClasses[intKey] =
            mergedGridStyle.rowClasses?.[intKey] || propGridStyle.rowClasses?.[intKey] || '';
          return rowClasses;
        }, {});
      }
      return mergedGridStyle;
    }, [props.gridStyle, mergedGridStyle]);

    const renderCustomGridBody = useCallback<NonNullable<EuiDataGridProps['renderCustomGridBody']>>(
      ({ visibleColumns: _visibleColumns, Cell, headerRow, footerRow }) => (
        <>
          {headerRow}
          <CustomGridBody
            visibleColumns={_visibleColumns}
            Cell={Cell}
            actualGridStyle={actualGridStyle}
            alertsData={oldAlertsData}
            pageIndex={pageIndex}
            pageSize={pageSize}
            isLoading={isLoadingAlerts}
            stripes={props.gridStyle?.stripes}
          />
          {footerRow}
        </>
      ),
      [
        actualGridStyle,
        oldAlertsData,
        pageIndex,
        pageSize,
        isLoadingAlerts,
        props.gridStyle?.stripes,
      ]
    );

    const sortProps = useMemo(() => {
      return { columns: sortingColumns, onSort };
    }, [sortingColumns, onSort]);

    const columnVisibility = useMemo(() => {
      return { visibleColumns, setVisibleColumns: onChangeVisibleColumns };
    }, [visibleColumns, onChangeVisibleColumns]);

    const rowStyles = useMemo(
      () => css`
        .alertsTableHighlightedRow {
          background-color: ${euiThemeVars.euiColorHighlight};
        }

        .alertsTableActiveRow {
          background-color: ${colorMode === 'LIGHT'
            ? tint(euiThemeVars.euiColorLightShade, 0.5)
            : euiThemeVars.euiColorLightShade};
        }
      `,
      [colorMode]
    );

    return (
      <InspectButtonContainer>
        <section style={{ width: '100%' }} data-test-subj={props['data-test-subj']}>
          <Suspense fallback={null}>
            {flyoutAlertIndex > -1 && (
              <AlertsFlyout
                {...renderContext}
                alert={alerts[flyoutAlertIndex]}
                alertsCount={alertsCount}
                onClose={handleFlyoutClose}
                flyoutIndex={flyoutAlertIndex + pageIndex * pageSize}
                onPaginate={onPaginateFlyout}
              />
            )}
          </Suspense>
          {alertsCount > 0 && (
            <EuiDataGrid
              {...euiDataGridProps}
              // As per EUI docs, it is not recommended to switch between undefined and defined height.
              // If user changes height, it is better to unmount and mount the component.
              // Ref: https://eui.elastic.co/#/tabular-content/data-grid#virtualization
              key={height ? 'fixedHeight' : 'autoHeight'}
              ref={dataGridRef}
              css={rowStyles}
              aria-label="Alerts table"
              data-test-subj="alertsTable"
              height={height}
              columns={columnsWithCellActions}
              columnVisibility={columnVisibility}
              trailingControlColumns={trailingControlColumns}
              leadingControlColumns={leadingControlColumns}
              rowCount={alertsCount}
              renderCustomGridBody={dynamicRowHeight ? renderCustomGridBody : undefined}
              cellContext={renderContext}
              renderCellValue={CellValueHost as RenderCellValue} // CellValue will receive the correct props through `cellContext`
              renderCellPopover={CellPopoverHost}
              gridStyle={actualGridStyle}
              sorting={sortProps}
              toolbarVisibility={toolbarVisibility}
              pagination={dataGridPagination}
              rowHeightsOptions={rowHeightsOptions}
              onColumnResize={onColumnResize}
            />
          )}
        </section>
      </InspectButtonContainer>
    );
  }
);

(AlertsDataGrid as FC).displayName = 'AlertsDataGrid';

// eslint-disable-next-line import/no-default-export
export { AlertsDataGrid as default };
