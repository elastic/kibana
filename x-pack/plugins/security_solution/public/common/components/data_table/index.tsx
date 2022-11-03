/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridRefProps,
  EuiDataGridColumn,
  EuiDataGridCellValueElementProps,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { EuiDataGrid, EuiLoadingSpinner, EuiProgress } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React, { Suspense, useCallback, useEffect, useMemo, useContext, useRef, lazy } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';

import styled, { ThemeContext } from 'styled-components';
import type { Filter } from '@kbn/es-query';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import type { FieldBrowserOptions } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import type { SetEventsDeleted, SetEventsLoading } from '../../../../common/types/bulk_actions';
import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  OnRowSelected,
  OnSelectAll,
  RowRenderer,
} from '../../../../common/types/timeline';

import type { TimelineItem } from '../../../../common/search_strategy/timeline';

import { getColumnHeader, getColumnHeaders } from './column_headers/helpers';
import {
  addBuildingBlockStyle,
  getEventIdToDataMapping,
  hasCellActions,
  mapSortDirectionToDirection,
  mapSortingColumns,
} from './helpers';

import type { BrowserFields } from '../../../../common/search_strategy/index_fields';
import { REMOVE_COLUMN } from './column_headers/translations';
import { dataTableActions, dataTableSelectors } from '../../store/data_table';
import type { AlertWorkflowStatus, Refetch } from '../../types';
import type { DataTableState, DataTableModel } from '../../store/data_table/types';
import { AlertCount, defaultUnit } from '../toolbar/alert';
import type { BulkActionsProp } from '../toolbar/bulk_actions/types';
import { useKibana } from '../../lib/kibana';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { checkBoxControlColumn, transformControlColumns } from '../control_columns';
import { getPageRowIndex } from './pagination';
import type { ControlColumnProps, DataTableCellAction } from '../../../../common/types';

const DATA_TABLE_ARIA_LABEL = i18n.translate('xpack.securitySolution.dataTable.ariaLabel', {
  defaultMessage: 'Alerts',
});

const StatefulAlertBulkActions = lazy(() => import('../toolbar/bulk_actions/alert_bulk_actions'));
interface OwnProps {
  activePage: number;
  additionalControls?: React.ReactNode;
  browserFields: BrowserFields;
  bulkActions?: BulkActionsProp;
  data: TimelineItem[];
  defaultCellActions?: DataTableCellAction[];
  disabledCellActions: string[];
  fieldBrowserOptions?: FieldBrowserOptions;
  filters?: Filter[];
  filterQuery?: string;
  filterStatus?: AlertWorkflowStatus;
  id: string;
  indexNames: string[];
  itemsPerPageOptions: number[];
  leadingControlColumns?: ControlColumnProps[];
  loadPage: (newActivePage: number) => void;
  onRuleChange?: () => void;
  pageSize: number;
  refetch: Refetch;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  tabType: string;
  totalItems: number;
  unit?: (total: number) => React.ReactNode;
  hasAlertsCrud?: boolean;
  showCheckboxes?: boolean;
}

const ES_LIMIT_COUNT = 9999;

const EMPTY_CONTROL_COLUMNS: ControlColumnProps[] = [];

const gridStyle: EuiDataGridStyle = { border: 'none', fontSize: 's', header: 'underline' };

const EuiDataGridContainer = styled.div<{ hideLastPage: boolean }>`
  ul.euiPagination__list {
    li.euiPagination__item:last-child {
      ${({ hideLastPage }) => `${hideLastPage ? 'display:none' : ''}`};
    }
  }
`;

export type StatefulBodyProps = OwnProps & PropsFromRedux;

/**
 * The Body component is used everywhere timeline is used within the security application. It is the highest level component
 * that is shared across all implementations of the timeline.
 */

export const DataTableComponent = React.memo<StatefulBodyProps>(
  ({
    activePage,
    additionalControls,
    browserFields,
    bulkActions = true,
    clearSelected,
    columnHeaders,
    data,
    defaultCellActions,
    disabledCellActions,
    fieldBrowserOptions,
    filterQuery,
    filters,
    filterStatus,
    hasAlertsCrud,
    id,
    indexNames,
    isLoading,
    isSelectAllChecked,
    itemsPerPageOptions,
    leadingControlColumns = EMPTY_CONTROL_COLUMNS,
    loadingEventIds,
    loadPage,
    onRuleChange,
    pageSize,
    refetch,
    renderCellValue,
    rowRenderers,
    selectedEventIds,
    setSelected,
    showCheckboxes,
    sort,
    tabType,
    totalItems,
    unit = defaultUnit,
  }) => {
    const {
      triggersActionsUi: { getFieldBrowser },
    } = useKibana().services;
    const dataGridRef = useRef<EuiDataGridRefProps>(null);

    const dispatch = useDispatch();
    const getDataTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);
    const { queryFields, selectAll, defaultColumns } = useDeepEqualSelector((state) =>
      getDataTable(state, id)
    );

    const alertCountText = useMemo(
      () => `${totalItems.toLocaleString()} ${unit(totalItems)}`,
      [totalItems, unit]
    );

    const selectedCount = useMemo(() => Object.keys(selectedEventIds).length, [selectedEventIds]);

    const theme: EuiTheme = useContext(ThemeContext);
    const onRowSelected: OnRowSelected = useCallback(
      ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
        setSelected({
          id,
          eventIds: getEventIdToDataMapping(data, eventIds, queryFields, hasAlertsCrud ?? false),
          isSelected,
          isSelectAllChecked: isSelected && selectedCount + 1 === data.length,
        });
      },
      [setSelected, id, data, queryFields, hasAlertsCrud, selectedCount]
    );

    const onSelectPage: OnSelectAll = useCallback(
      ({ isSelected }: { isSelected: boolean }) =>
        isSelected
          ? setSelected({
              id,
              eventIds: getEventIdToDataMapping(
                data,
                data.map((event) => event._id),
                queryFields,
                hasAlertsCrud ?? false
              ),
              isSelected,
              isSelectAllChecked: isSelected,
            })
          : clearSelected({ id }),
      [setSelected, id, data, queryFields, hasAlertsCrud, clearSelected]
    );

    // Sync to selectAll so parent components can select all events
    useEffect(() => {
      if (selectAll && !isSelectAllChecked) {
        onSelectPage({ isSelected: true });
      }
    }, [isSelectAllChecked, onSelectPage, selectAll]);

    const onAlertStatusActionSuccess = useMemo(() => {
      if (bulkActions && bulkActions !== true) {
        return bulkActions.onAlertStatusActionSuccess;
      }
    }, [bulkActions]);

    const onAlertStatusActionFailure = useMemo(() => {
      if (bulkActions && bulkActions !== true) {
        return bulkActions.onAlertStatusActionFailure;
      }
    }, [bulkActions]);

    const additionalBulkActions = useMemo(() => {
      if (bulkActions && bulkActions !== true && bulkActions.customBulkActions !== undefined) {
        return bulkActions.customBulkActions.map((action) => {
          return {
            ...action,
            onClick: (eventIds: string[]) => {
              const items = data.filter((item) => {
                return eventIds.find((event) => item._id === event);
              });
              action.onClick(items);
            },
          };
        });
      }
    }, [bulkActions, data]);

    const showAlertStatusActions = useMemo(() => {
      if (!hasAlertsCrud) {
        return false;
      }
      if (typeof bulkActions === 'boolean') {
        return bulkActions;
      }
      return bulkActions.alertStatusActions ?? true;
    }, [bulkActions, hasAlertsCrud]);

    const showBulkActions = useMemo(() => {
      if (!hasAlertsCrud) {
        return false;
      }

      if (selectedCount === 0 || !showCheckboxes) {
        return false;
      }
      if (typeof bulkActions === 'boolean') {
        return bulkActions;
      }
      return (bulkActions?.customBulkActions?.length || bulkActions?.alertStatusActions) ?? true;
    }, [hasAlertsCrud, selectedCount, showCheckboxes, bulkActions]);

    const onResetColumns = useCallback(() => {
      dispatch(dataTableActions.updateColumns({ id, columns: defaultColumns }));
    }, [defaultColumns, dispatch, id]);

    const onToggleColumn = useCallback(
      (columnId: string) => {
        if (columnHeaders.some(({ id: columnHeaderId }) => columnId === columnHeaderId)) {
          dispatch(
            dataTableActions.removeColumn({
              columnId,
              id,
            })
          );
        } else {
          dispatch(
            dataTableActions.upsertColumn({
              column: getColumnHeader(columnId, defaultColumns),
              id,
              index: 1,
            })
          );
        }
      },
      [columnHeaders, dispatch, id, defaultColumns]
    );

    const toolbarVisibility: EuiDataGridToolBarVisibilityOptions = useMemo(
      () => ({
        additionalControls: (
          <>
            {isLoading && <EuiProgress size="xs" position="absolute" color="accent" />}
            <AlertCount data-test-subj="server-side-event-count">{alertCountText}</AlertCount>
            {showBulkActions ? (
              <>
                <Suspense fallback={<EuiLoadingSpinner />}>
                  <StatefulAlertBulkActions
                    showAlertStatusActions={showAlertStatusActions}
                    data-test-subj="bulk-actions"
                    id={id}
                    totalItems={totalItems}
                    filterStatus={filterStatus}
                    query={filterQuery}
                    indexName={indexNames.join()}
                    onActionSuccess={onAlertStatusActionSuccess}
                    onActionFailure={onAlertStatusActionFailure}
                    customBulkActions={additionalBulkActions}
                    refetch={refetch}
                  />
                </Suspense>
                {additionalControls ?? null}
              </>
            ) : (
              <>
                {additionalControls ?? null}
                {getFieldBrowser({
                  browserFields,
                  options: fieldBrowserOptions,
                  columnIds: columnHeaders.map(({ id: columnId }) => columnId),
                  onResetColumns,
                  onToggleColumn,
                })}
              </>
            )}
          </>
        ),
        ...(showBulkActions
          ? {
              showColumnSelector: false,
              showSortSelector: false,
              showFullScreenSelector: false,
            }
          : {
              showColumnSelector: { allowHide: false, allowReorder: true },
              showSortSelector: true,
              showFullScreenSelector: true,
            }),
        showDisplaySelector: false,
      }),
      [
        isLoading,
        alertCountText,
        showBulkActions,
        showAlertStatusActions,
        id,
        totalItems,
        filterStatus,
        filterQuery,
        indexNames,
        onAlertStatusActionSuccess,
        onAlertStatusActionFailure,
        additionalBulkActions,
        refetch,
        additionalControls,
        getFieldBrowser,
        browserFields,
        fieldBrowserOptions,
        columnHeaders,
        onResetColumns,
        onToggleColumn,
      ]
    );

    const sortingColumns: Array<{
      id: string;
      direction: 'asc' | 'desc';
    }> = useMemo(
      () =>
        sort.map((x) => ({
          id: x.columnId,
          direction: mapSortDirectionToDirection(x.sortDirection),
        })),
      [sort]
    );

    const onSort = useCallback(
      (
        nextSortingColumns: Array<{
          id: string;
          direction: 'asc' | 'desc';
        }>
      ) => {
        dispatch(
          dataTableActions.updateSort({
            id,
            sort: mapSortingColumns({ columns: nextSortingColumns, columnHeaders }),
          })
        );

        setTimeout(() => {
          // schedule the query to be re-executed from page 0, (but only after the
          // store has been updated with the new sort):
          if (loadPage != null) {
            loadPage(0);
          }
        }, 0);
      },
      [columnHeaders, dispatch, id, loadPage]
    );

    const visibleColumns = useMemo(() => columnHeaders.map(({ id: cid }) => cid), [columnHeaders]); // the full set of columns

    const onColumnResize = useCallback(
      ({ columnId, width }: { columnId: string; width: number }) => {
        dispatch(
          dataTableActions.updateColumnWidth({
            columnId,
            id,
            width,
          })
        );
      },
      [dispatch, id]
    );

    const onSetVisibleColumns = useCallback(
      (newVisibleColumns: string[]) => {
        dispatch(
          dataTableActions.updateColumnOrder({
            columnIds: newVisibleColumns,
            id,
          })
        );
      },
      [dispatch, id]
    );

    const setEventsLoading = useCallback<SetEventsLoading>(
      ({ eventIds, isLoading: loading }) => {
        dispatch(dataTableActions.setEventsLoading({ id, eventIds, isLoading: loading }));
      },
      [dispatch, id]
    );

    const setEventsDeleted = useCallback<SetEventsDeleted>(
      ({ eventIds, isDeleted }) => {
        dispatch(dataTableActions.setEventsDeleted({ id, eventIds, isDeleted }));
      },
      [dispatch, id]
    );

    const [leadingTGridControlColumns] = useMemo(() => {
      return [
        showCheckboxes ? [checkBoxControlColumn, ...leadingControlColumns] : leadingControlColumns,
      ].map((controlColumns) =>
        transformControlColumns({
          columnHeaders,
          controlColumns,
          data,
          disabledCellActions,
          fieldBrowserOptions,
          loadingEventIds,
          onRowSelected,
          onRuleChange,
          selectedEventIds,
          showCheckboxes,
          tabType,
          timelineId: id,
          isSelectAllChecked,
          sort,
          browserFields,
          onSelectPage,
          theme,
          setEventsLoading,
          setEventsDeleted,
          pageSize,
        })
      );
    }, [
      showCheckboxes,
      leadingControlColumns,
      columnHeaders,
      data,
      disabledCellActions,
      fieldBrowserOptions,
      id,
      loadingEventIds,
      onRowSelected,
      onRuleChange,
      selectedEventIds,
      tabType,
      isSelectAllChecked,
      sort,
      browserFields,
      onSelectPage,
      theme,
      pageSize,
      setEventsLoading,
      setEventsDeleted,
    ]);
    const columnsWithCellActions: EuiDataGridColumn[] = useMemo(
      () =>
        columnHeaders.map((header) => {
          const buildAction = (dataTableCellAction: DataTableCellAction) =>
            dataTableCellAction({
              browserFields,
              data: data.map((row) => row.data),
              ecsData: data.map((row) => row.ecs),
              header: columnHeaders.find((h) => h.id === header.id),
              pageSize,
              scopeId: id,
              closeCellPopover: dataGridRef.current?.closeCellPopover,
            });
          return {
            ...header,
            actions: {
              ...header.actions,
              additional: [
                {
                  iconType: 'cross',
                  label: REMOVE_COLUMN,
                  onClick: () => {
                    dispatch(dataTableActions.removeColumn({ id, columnId: header.id }));
                  },
                  size: 'xs',
                },
              ],
            },
            ...(hasCellActions({
              columnId: header.id,
              disabledCellActions,
            })
              ? {
                  cellActions:
                    header.dataTableCellActions?.map(buildAction) ??
                    defaultCellActions?.map(buildAction),
                  visibleCellActions: 3,
                }
              : {}),
          };
        }),
      [
        browserFields,
        columnHeaders,
        data,
        defaultCellActions,
        disabledCellActions,
        dispatch,
        id,
        pageSize,
      ]
    );

    const renderTGridCellValue = useMemo(() => {
      const Cell: React.FC<EuiDataGridCellValueElementProps> = ({
        columnId,
        rowIndex,
        colIndex,
        setCellProps,
        isDetails,
      }): React.ReactElement | null => {
        const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
        const rowData = pageRowIndex < data.length ? data[pageRowIndex].data : null;
        const header = columnHeaders.find((h) => h.id === columnId);
        const eventId = pageRowIndex < data.length ? data[pageRowIndex]._id : null;
        const ecs = pageRowIndex < data.length ? data[pageRowIndex].ecs : null;

        useEffect(() => {
          const defaultStyles = { overflow: 'hidden' };
          setCellProps({ style: { ...defaultStyles } });
          if (ecs && rowData) {
            addBuildingBlockStyle(ecs, theme, setCellProps, defaultStyles);
          } else {
            // disable the cell when it has no data
            setCellProps({ style: { display: 'none' } });
          }
        }, [rowIndex, setCellProps, ecs, rowData]);

        if (rowData == null || header == null || eventId == null || ecs === null) {
          return null;
        }

        return renderCellValue({
          browserFields,
          columnId: header.id,
          data: rowData,
          ecsData: ecs,
          eventId,
          globalFilters: filters,
          header,
          isDetails,
          isDraggable: false,
          isExpandable: true,
          isExpanded: false,
          linkValues: getOr([], header.linkField ?? '', ecs),
          rowIndex,
          colIndex,
          rowRenderers,
          setCellProps,
          scopeId: id,
          truncate: isDetails ? false : true,
        }) as React.ReactElement;
      };
      return Cell;
    }, [
      browserFields,
      columnHeaders,
      data,
      filters,
      id,
      pageSize,
      renderCellValue,
      rowRenderers,
      theme,
    ]);

    const onChangeItemsPerPage = useCallback(
      (itemsChangedPerPage) => {
        dispatch(dataTableActions.updateItemsPerPage({ id, itemsPerPage: itemsChangedPerPage }));
      },
      [id, dispatch]
    );

    const onChangePage = useCallback(
      (page) => {
        loadPage(page);
      },
      [loadPage]
    );

    return (
      <>
        <EuiDataGridContainer hideLastPage={totalItems > ES_LIMIT_COUNT}>
          <EuiDataGrid
            id={'body-data-grid'}
            data-test-subj="body-data-grid"
            aria-label={DATA_TABLE_ARIA_LABEL}
            columns={columnsWithCellActions}
            columnVisibility={{ visibleColumns, setVisibleColumns: onSetVisibleColumns }}
            gridStyle={gridStyle}
            leadingControlColumns={leadingTGridControlColumns}
            toolbarVisibility={toolbarVisibility}
            rowCount={totalItems}
            renderCellValue={renderTGridCellValue}
            sorting={{ columns: sortingColumns, onSort }}
            onColumnResize={onColumnResize}
            pagination={{
              pageIndex: activePage,
              pageSize,
              pageSizeOptions: itemsPerPageOptions,
              onChangeItemsPerPage,
              onChangePage,
            }}
            ref={dataGridRef}
          />
        </EuiDataGridContainer>
      </>
    );
  }
);

DataTableComponent.displayName = 'DataTableComponent';

const makeMapStateToProps = () => {
  const memoizedColumnHeaders: (
    headers: ColumnHeaderOptions[],
    browserFields: BrowserFields
  ) => ColumnHeaderOptions[] = memoizeOne(getColumnHeaders);

  const getDataTable = dataTableSelectors.getTableByIdSelector();
  const mapStateToProps = (
    state: DataTableState,
    { browserFields, id, hasAlertsCrud }: OwnProps
  ) => {
    const dataTable: DataTableModel = getDataTable(state, id);
    const {
      columns,
      isSelectAllChecked,
      loadingEventIds,
      selectedEventIds,
      showCheckboxes,
      sort,
      isLoading,
    } = dataTable;

    return {
      columnHeaders: memoizedColumnHeaders(columns, browserFields),
      isSelectAllChecked,
      loadingEventIds,
      isLoading,
      id,
      selectedEventIds,
      showCheckboxes: hasAlertsCrud === true && showCheckboxes,
      sort,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  clearSelected: dataTableActions.clearSelected,
  setSelected: dataTableActions.setSelected,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulDataTableComponent: React.FunctionComponent<OwnProps> =
  connector(DataTableComponent);
