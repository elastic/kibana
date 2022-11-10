/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGrid,
  EuiDataGridRefProps,
  EuiDataGridColumn,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
} from '@elastic/eui';
import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React, {
  ComponentType,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useContext,
  useRef,
} from 'react';
import { connect, ConnectedProps, useDispatch } from 'react-redux';

import styled, { ThemeContext } from 'styled-components';
import { ALERT_RULE_CONSUMER, ALERT_RULE_PRODUCER } from '@kbn/rule-data-utils';
import { Filter } from '@kbn/es-query';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { FieldBrowserOptions } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  TGridCellAction,
  BulkActionsProp,
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRenderer,
  AlertStatus,
  SortColumnTable,
  SetEventsLoading,
  SetEventsDeleted,
} from '../../../../common/types/timeline';

import type { TimelineItem, TimelineNonEcsData } from '../../../../common/search_strategy/timeline';

import { getColumnHeader, getColumnHeaders } from './column_headers/helpers';
import {
  addBuildingBlockStyle,
  getEventIdToDataMapping,
  hasCellActions,
  mapSortDirectionToDirection,
  mapSortingColumns,
} from './helpers';

import type { BrowserFields } from '../../../../common/search_strategy/index_fields';
import type { OnRowSelected, OnSelectAll } from '../types';
import type { Refetch } from '../../../store/t_grid/inputs';
import { Ecs } from '../../../../common/ecs';
import { getPageRowIndex } from '../../../../common/utils/pagination';
import { StatefulEventContext } from '../../stateful_event_context';
import { tGridActions, TGridModel, tGridSelectors, TableState } from '../../../store/t_grid';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { RowAction } from './row_action';
import * as i18n from './translations';
import { AlertCount } from '../styles';
import { checkBoxControlColumn } from './control_columns';
import { ViewSelection } from '../event_rendered_view/selector';
import { EventRenderedView } from '../event_rendered_view';
import { REMOVE_COLUMN } from './column_headers/translations';
import { TimelinesStartPlugins } from '../../../types';

const StatefulAlertBulkActions = lazy(() => import('../toolbar/bulk_actions/alert_bulk_actions'));

interface OwnProps {
  activePage: number;
  additionalControls?: React.ReactNode;
  appId?: string;
  browserFields: BrowserFields;
  bulkActions?: BulkActionsProp;
  data: TimelineItem[];
  defaultCellActions?: TGridCellAction[];
  disabledCellActions: string[];
  fieldBrowserOptions?: FieldBrowserOptions;
  filters?: Filter[];
  filterQuery?: string;
  filterStatus?: AlertStatus;
  getRowRenderer?: ({
    data,
    rowRenderers,
  }: {
    data: Ecs;
    rowRenderers: RowRenderer[];
  }) => RowRenderer | null;
  id: string;
  indexNames: string[];
  isEventViewer?: boolean;
  itemsPerPageOptions: number[];
  leadingControlColumns?: ControlColumnProps[];
  loadPage: (newActivePage: number) => void;
  onRuleChange?: () => void;
  pageSize: number;
  refetch: Refetch;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  tableView: ViewSelection;
  tabType: string;
  totalItems: number;
  trailingControlColumns?: ControlColumnProps[];
  unit?: (total: number) => React.ReactNode;
  hasAlertsCrud?: boolean;
  hasAlertsCrudPermissions?: ({
    ruleConsumer,
    ruleProducer,
  }: {
    ruleConsumer: string;
    ruleProducer?: string;
  }) => boolean;
  totalSelectAllAlerts?: number;
  showCheckboxes?: boolean;
}

const defaultUnit = (n: number) => i18n.ALERTS_UNIT(n);

const ES_LIMIT_COUNT = 9999;

const EMPTY_CONTROL_COLUMNS: ControlColumnProps[] = [];

const EmptyHeaderCellRender: ComponentType = () => null;

const gridStyle: EuiDataGridStyle = { border: 'none', fontSize: 's', header: 'underline' };

const EuiDataGridContainer = styled.div<{ hideLastPage: boolean }>`
  ul.euiPagination__list {
    li.euiPagination__item:last-child {
      ${({ hideLastPage }) => `${hideLastPage ? 'display:none' : ''}`};
    }
  }
`;

const transformControlColumns = ({
  columnHeaders,
  controlColumns,
  data,
  fieldBrowserOptions,
  isEventViewer = false,
  loadingEventIds,
  onRowSelected,
  onRuleChange,
  selectedEventIds,
  showCheckboxes,
  tabType,
  timelineId,
  isSelectAllChecked,
  onSelectPage,
  browserFields,
  pageSize,
  sort,
  theme,
  setEventsLoading,
  setEventsDeleted,
  hasAlertsCrudPermissions,
}: {
  columnHeaders: ColumnHeaderOptions[];
  controlColumns: ControlColumnProps[];
  data: TimelineItem[];
  disabledCellActions: string[];
  fieldBrowserOptions?: FieldBrowserOptions;
  isEventViewer?: boolean;
  loadingEventIds: string[];
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  showCheckboxes: boolean;
  tabType: string;
  timelineId: string;
  isSelectAllChecked: boolean;
  browserFields: BrowserFields;
  onSelectPage: OnSelectAll;
  pageSize: number;
  sort: SortColumnTable[];
  theme: EuiTheme;
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
  hasAlertsCrudPermissions?: ({
    ruleConsumer,
    ruleProducer,
  }: {
    ruleConsumer: string;
    ruleProducer?: string;
  }) => boolean;
}): EuiDataGridControlColumn[] =>
  controlColumns.map(
    ({ id: columnId, headerCellRender = EmptyHeaderCellRender, rowCellRender, width }, i) => ({
      id: `${columnId}`,
      headerCellRender: () => {
        const HeaderActions = headerCellRender;
        return (
          <>
            {HeaderActions && (
              <HeaderActions
                width={width}
                browserFields={browserFields}
                fieldBrowserOptions={fieldBrowserOptions}
                columnHeaders={columnHeaders}
                isEventViewer={isEventViewer}
                isSelectAllChecked={isSelectAllChecked}
                onSelectAll={onSelectPage}
                showEventsSelect={false}
                showSelectAllCheckbox={showCheckboxes}
                sort={sort}
                tabType={tabType}
                timelineId={timelineId}
              />
            )}
          </>
        );
      },
      rowCellRender: ({
        isDetails,
        isExpandable,
        isExpanded,
        rowIndex,
        colIndex,
        setCellProps,
      }: EuiDataGridCellValueElementProps) => {
        const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
        const rowData = data[pageRowIndex];

        let disabled = false;
        if (rowData) {
          addBuildingBlockStyle(rowData.ecs, theme, setCellProps);
          if (columnId === 'checkbox-control-column' && hasAlertsCrudPermissions != null) {
            // FUTURE ENGINEER, the assumption here is you can only have one producer and consumer at this time
            const ruleConsumers =
              rowData.data.find((d) => d.field === ALERT_RULE_CONSUMER)?.value ?? [];
            const ruleProducers =
              rowData.data.find((d) => d.field === ALERT_RULE_PRODUCER)?.value ?? [];
            disabled = !hasAlertsCrudPermissions({
              ruleConsumer: ruleConsumers.length > 0 ? ruleConsumers[0] : '',
              ruleProducer: ruleProducers.length > 0 ? ruleProducers[0] : undefined,
            });
          }
        } else {
          // disable the cell when it has no data
          setCellProps({ style: { display: 'none' } });
        }

        return (
          <RowAction
            columnId={columnId ?? ''}
            columnHeaders={columnHeaders}
            controlColumn={controlColumns[i]}
            data={data}
            disabled={disabled}
            index={i}
            isDetails={isDetails}
            isExpanded={isExpanded}
            isEventViewer={isEventViewer}
            isExpandable={isExpandable}
            loadingEventIds={loadingEventIds}
            onRowSelected={onRowSelected}
            onRuleChange={onRuleChange}
            rowIndex={rowIndex}
            colIndex={colIndex}
            pageRowIndex={pageRowIndex}
            selectedEventIds={selectedEventIds}
            setCellProps={setCellProps}
            showCheckboxes={showCheckboxes}
            tabType={tabType}
            tableId={timelineId}
            width={width}
            setEventsLoading={setEventsLoading}
            setEventsDeleted={setEventsDeleted}
          />
        );
      },
      width,
    })
  );

export type StatefulBodyProps = OwnProps & PropsFromRedux;

/**
 * The Body component is used everywhere timeline is used within the security application. It is the highest level component
 * that is shared across all implementations of the timeline.
 */

export const BodyComponent = React.memo<StatefulBodyProps>(
  ({
    activePage,
    additionalControls,
    appId = '',
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
    getRowRenderer,
    hasAlertsCrud,
    hasAlertsCrudPermissions,
    id,
    indexNames,
    isEventViewer = false,
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
    tableView = 'gridView',
    tabType,
    totalItems,
    totalSelectAllAlerts,
    trailingControlColumns = EMPTY_CONTROL_COLUMNS,
    unit = defaultUnit,
  }) => {
    const { triggersActionsUi } = useKibana<TimelinesStartPlugins>().services;

    const dataGridRef = useRef<EuiDataGridRefProps>(null);

    const dispatch = useDispatch();
    const getManageTimeline = useMemo(() => tGridSelectors.getManageDataTableById(), []);
    const { queryFields, selectAll, defaultColumns } = useDeepEqualSelector((state) =>
      getManageTimeline(state, id)
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
          eventIds: getEventIdToDataMapping(
            data,
            eventIds,
            queryFields,
            hasAlertsCrud ?? false,
            hasAlertsCrudPermissions
          ),
          isSelected,
          isSelectAllChecked: isSelected && selectedCount + 1 === data.length,
        });
      },
      [setSelected, id, data, queryFields, hasAlertsCrud, hasAlertsCrudPermissions, selectedCount]
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
                hasAlertsCrud ?? false,
                hasAlertsCrudPermissions
              ),
              isSelected,
              isSelectAllChecked: isSelected,
            })
          : clearSelected({ id }),
      [setSelected, id, data, queryFields, hasAlertsCrud, hasAlertsCrudPermissions, clearSelected]
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
      dispatch(tGridActions.updateColumns({ id, columns: defaultColumns }));
    }, [defaultColumns, dispatch, id]);

    const onToggleColumn = useCallback(
      (columnId: string) => {
        if (columnHeaders.some(({ id: columnHeaderId }) => columnId === columnHeaderId)) {
          dispatch(
            tGridActions.removeColumn({
              columnId,
              id,
            })
          );
        } else {
          dispatch(
            tGridActions.upsertColumn({
              column: getColumnHeader(columnId, defaultColumns),
              id,
              index: 1,
            })
          );
        }
      },
      [columnHeaders, dispatch, id, defaultColumns]
    );

    const alertToolbar = useMemo(
      () => (
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <AlertCount>{alertCountText}</AlertCount>
          </EuiFlexItem>
          {showBulkActions && (
            <Suspense fallback={<EuiLoadingSpinner />}>
              <StatefulAlertBulkActions
                showAlertStatusActions={showAlertStatusActions}
                data-test-subj="bulk-actions"
                id={id}
                totalItems={totalSelectAllAlerts ?? totalItems}
                filterStatus={filterStatus}
                query={filterQuery}
                indexName={indexNames.join()}
                onActionSuccess={onAlertStatusActionSuccess}
                onActionFailure={onAlertStatusActionFailure}
                customBulkActions={additionalBulkActions}
                refetch={refetch}
              />
            </Suspense>
          )}
        </EuiFlexGroup>
      ),
      [
        additionalBulkActions,
        alertCountText,
        filterQuery,
        filterStatus,
        id,
        indexNames,
        onAlertStatusActionFailure,
        onAlertStatusActionSuccess,
        refetch,
        showAlertStatusActions,
        showBulkActions,
        totalItems,
        totalSelectAllAlerts,
      ]
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
                    totalItems={totalSelectAllAlerts ?? totalItems}
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
                {triggersActionsUi.getFieldBrowser({
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
        totalSelectAllAlerts,
        totalItems,
        filterStatus,
        filterQuery,
        indexNames,
        onAlertStatusActionSuccess,
        onAlertStatusActionFailure,
        onResetColumns,
        onToggleColumn,
        triggersActionsUi,
        additionalBulkActions,
        refetch,
        additionalControls,
        browserFields,
        fieldBrowserOptions,
        columnHeaders,
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
          tGridActions.updateSort({
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
          tGridActions.updateColumnWidth({
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
          tGridActions.updateColumnOrder({
            columnIds: newVisibleColumns,
            id,
          })
        );
      },
      [dispatch, id]
    );

    const setEventsLoading = useCallback<SetEventsLoading>(
      ({ eventIds, isLoading: loading }) => {
        dispatch(tGridActions.setEventsLoading({ id, eventIds, isLoading: loading }));
      },
      [dispatch, id]
    );

    const setEventsDeleted = useCallback<SetEventsDeleted>(
      ({ eventIds, isDeleted }) => {
        dispatch(tGridActions.setEventsDeleted({ id, eventIds, isDeleted }));
      },
      [dispatch, id]
    );

    const [leadingTGridControlColumns, trailingTGridControlColumns] = useMemo(() => {
      return [
        showCheckboxes ? [checkBoxControlColumn, ...leadingControlColumns] : leadingControlColumns,
        trailingControlColumns,
      ].map((controlColumns) =>
        transformControlColumns({
          columnHeaders,
          controlColumns,
          data,
          disabledCellActions,
          fieldBrowserOptions,
          isEventViewer,
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
          hasAlertsCrudPermissions,
        })
      );
    }, [
      showCheckboxes,
      leadingControlColumns,
      trailingControlColumns,
      columnHeaders,
      data,
      disabledCellActions,
      fieldBrowserOptions,
      isEventViewer,
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
      hasAlertsCrudPermissions,
    ]);
    const columnsWithCellActions: EuiDataGridColumn[] = useMemo(
      () =>
        columnHeaders.map((header) => {
          const buildAction = (tGridCellAction: TGridCellAction) =>
            tGridCellAction({
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
                    dispatch(tGridActions.removeColumn({ id, columnId: header.id }));
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
                    header.tGridCellActions?.map(buildAction) ??
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
        dispatch(tGridActions.updateItemsPerPage({ id, itemsPerPage: itemsChangedPerPage }));
      },
      [id, dispatch]
    );

    const onChangePage = useCallback(
      (page) => {
        loadPage(page);
      },
      [loadPage]
    );

    // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
    const [activeStatefulEventContext] = useState({
      timelineID: id,
      tabType,
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
    });
    return (
      <>
        <StatefulEventContext.Provider value={activeStatefulEventContext}>
          {tableView === 'gridView' && (
            <EuiDataGridContainer hideLastPage={totalItems > ES_LIMIT_COUNT}>
              <EuiDataGrid
                id={'body-data-grid'}
                data-test-subj="body-data-grid"
                aria-label={i18n.TGRID_BODY_ARIA_LABEL}
                columns={columnsWithCellActions}
                columnVisibility={{ visibleColumns, setVisibleColumns: onSetVisibleColumns }}
                gridStyle={gridStyle}
                leadingControlColumns={leadingTGridControlColumns}
                trailingControlColumns={trailingTGridControlColumns}
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
          )}
          {tableView === 'eventRenderedView' && (
            <EventRenderedView
              appId={appId}
              alertToolbar={alertToolbar}
              events={data}
              getRowRenderer={getRowRenderer}
              leadingControlColumns={leadingTGridControlColumns ?? []}
              onChangePage={onChangePage}
              onChangeItemsPerPage={onChangeItemsPerPage}
              pageIndex={activePage}
              pageSize={pageSize}
              pageSizeOptions={itemsPerPageOptions}
              rowRenderers={rowRenderers}
              timelineId={id}
              totalItemCount={totalItems}
            />
          )}
        </StatefulEventContext.Provider>
      </>
    );
  }
);

BodyComponent.displayName = 'BodyComponent';

const makeMapStateToProps = () => {
  const memoizedColumnHeaders: (
    headers: ColumnHeaderOptions[],
    browserFields: BrowserFields
  ) => ColumnHeaderOptions[] = memoizeOne(getColumnHeaders);

  const getTGrid = tGridSelectors.getTGridByIdSelector();
  const mapStateToProps = (state: TableState, { browserFields, id, hasAlertsCrud }: OwnProps) => {
    const dataTable: TGridModel = getTGrid(state, id);
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
  clearSelected: tGridActions.clearSelected,
  setSelected: tGridActions.setSelected,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulBody: React.FunctionComponent<OwnProps> = connector(BodyComponent);
