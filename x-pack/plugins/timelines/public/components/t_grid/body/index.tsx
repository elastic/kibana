/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGrid,
  EuiDataGridColumn,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
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
} from 'react';

import { connect, ConnectedProps, useDispatch } from 'react-redux';

import { ThemeContext } from 'styled-components';
import {
  TGridCellAction,
  BulkActionsProp,
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRenderer,
  AlertStatus,
  SortColumnTimeline,
  TimelineId,
  TimelineTabs,
  SetEventsLoading,
  SetEventsDeleted,
} from '../../../../common/types/timeline';

import type { TimelineItem, TimelineNonEcsData } from '../../../../common/search_strategy/timeline';

import { getActionsColumnWidth, getColumnHeaders } from './column_headers/helpers';
import {
  addBuildingBlockStyle,
  getEventIdToDataMapping,
  mapSortDirectionToDirection,
  mapSortingColumns,
} from './helpers';

import { DEFAULT_ICON_BUTTON_WIDTH } from '../helpers';
import type { BrowserFields } from '../../../../common/search_strategy/index_fields';
import type { OnRowSelected, OnSelectAll } from '../types';
import type { Refetch } from '../../../store/t_grid/inputs';
import { StatefulFieldsBrowser } from '../../../';
import { tGridActions, TGridModel, tGridSelectors, TimelineState } from '../../../store/t_grid';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { RowAction } from './row_action';
import * as i18n from './translations';
import { AlertCount } from '../styles';
import { checkBoxControlColumn } from './control_columns';
import type { EuiTheme } from '../../../../../../../src/plugins/kibana_react/common';
import { ViewSelection } from '../event_rendered_view/selector';
import { EventRenderedView } from '../event_rendered_view';

const StatefulAlertStatusBulkActions = lazy(
  () => import('../toolbar/bulk_actions/alert_status_bulk_actions')
);

interface OwnProps {
  activePage: number;
  additionalControls?: React.ReactNode;
  browserFields: BrowserFields;
  bulkActions?: BulkActionsProp;
  data: TimelineItem[];
  defaultCellActions?: TGridCellAction[];
  filterQuery: string;
  filterStatus?: AlertStatus;
  id: string;
  indexNames: string[];
  isEventViewer?: boolean;
  itemsPerPageOptions: number[];
  leadingControlColumns?: ControlColumnProps[];
  loadPage: (newActivePage: number) => void;
  onRuleChange?: () => void;
  querySize: number;
  refetch: Refetch;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  tableView: ViewSelection;
  tabType: TimelineTabs;
  totalItems: number;
  totalPages: number;
  trailingControlColumns?: ControlColumnProps[];
  unit?: (total: number) => React.ReactNode;
  hasAlertsCrud?: boolean;
}

const defaultUnit = (n: number) => i18n.ALERTS_UNIT(n);
const NUM_OF_ICON_IN_TIMELINE_ROW = 2;

export const hasAdditionalActions = (id: TimelineId): boolean =>
  [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage, TimelineId.active].includes(
    id
  );

const EXTRA_WIDTH = 4; // px

const MIN_ACTION_COLUMN_WIDTH = 96; // px

const EMPTY_CONTROL_COLUMNS: ControlColumnProps[] = [];

const EmptyHeaderCellRender: ComponentType = () => null;

const gridStyle: EuiDataGridStyle = { border: 'none', fontSize: 's', header: 'underline' };

const transformControlColumns = ({
  actionColumnsWidth,
  columnHeaders,
  controlColumns,
  data,
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
  sort,
  theme,
  setEventsLoading,
  setEventsDeleted,
}: {
  actionColumnsWidth: number;
  columnHeaders: ColumnHeaderOptions[];
  controlColumns: ControlColumnProps[];
  data: TimelineItem[];
  isEventViewer?: boolean;
  loadingEventIds: string[];
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  showCheckboxes: boolean;
  tabType: TimelineTabs;
  timelineId: string;
  isSelectAllChecked: boolean;
  browserFields: BrowserFields;
  onSelectPage: OnSelectAll;
  sort: SortColumnTimeline[];
  theme: EuiTheme;
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
}): EuiDataGridControlColumn[] =>
  controlColumns.map(
    ({ id: columnId, headerCellRender = EmptyHeaderCellRender, rowCellRender, width }, i) => ({
      id: `${columnId}`,
      // eslint-disable-next-line react/display-name
      headerCellRender: () => {
        const HeaderActions = headerCellRender;
        return (
          <>
            {HeaderActions && (
              <HeaderActions
                width={width ?? MIN_ACTION_COLUMN_WIDTH}
                browserFields={browserFields}
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

      // eslint-disable-next-line react/display-name
      rowCellRender: ({
        isDetails,
        isExpandable,
        isExpanded,
        rowIndex,
        setCellProps,
      }: EuiDataGridCellValueElementProps) => {
        addBuildingBlockStyle(data[rowIndex].ecs, theme, setCellProps);

        return (
          <RowAction
            columnId={columnId ?? ''}
            columnHeaders={columnHeaders}
            controlColumn={controlColumns[i]}
            data={data}
            index={i}
            isDetails={isDetails}
            isExpanded={isExpanded}
            isEventViewer={isEventViewer}
            isExpandable={isExpandable}
            loadingEventIds={loadingEventIds}
            onRowSelected={onRowSelected}
            onRuleChange={onRuleChange}
            rowIndex={rowIndex}
            selectedEventIds={selectedEventIds}
            setCellProps={setCellProps}
            showCheckboxes={showCheckboxes}
            tabType={tabType}
            timelineId={timelineId}
            width={width ?? MIN_ACTION_COLUMN_WIDTH}
            setEventsLoading={setEventsLoading}
            setEventsDeleted={setEventsDeleted}
          />
        );
      },
      width: width ?? actionColumnsWidth,
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
    browserFields,
    bulkActions = true,
    clearSelected,
    columnHeaders,
    data,
    defaultCellActions,
    excludedRowRendererIds,
    filterQuery,
    filterStatus,
    id,
    indexNames,
    isEventViewer = false,
    isSelectAllChecked,
    itemsPerPageOptions,
    leadingControlColumns = EMPTY_CONTROL_COLUMNS,
    loadingEventIds,
    loadPage,
    onRuleChange,
    querySize,
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
    totalPages,
    trailingControlColumns = EMPTY_CONTROL_COLUMNS,
    unit = defaultUnit,
    hasAlertsCrud,
  }) => {
    const dispatch = useDispatch();
    const getManageTimeline = useMemo(() => tGridSelectors.getManageTimelineById(), []);
    const { queryFields, selectAll } = useDeepEqualSelector((state) =>
      getManageTimeline(state, id)
    );

    const alertCountText = useMemo(() => `${totalItems.toLocaleString()} ${unit(totalItems)}`, [
      totalItems,
      unit,
    ]);

    const selectedCount = useMemo(() => Object.keys(selectedEventIds).length, [selectedEventIds]);

    const theme: EuiTheme = useContext(ThemeContext);
    const onRowSelected: OnRowSelected = useCallback(
      ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
        setSelected({
          id,
          eventIds: getEventIdToDataMapping(data, eventIds, queryFields),
          isSelected,
          isSelectAllChecked: isSelected && selectedCount + 1 === data.length,
        });
      },
      [setSelected, id, data, selectedCount, queryFields]
    );

    const onSelectPage: OnSelectAll = useCallback(
      ({ isSelected }: { isSelected: boolean }) =>
        isSelected
          ? setSelected({
              id,
              eventIds: getEventIdToDataMapping(
                data,
                data.map((event) => event._id),
                queryFields
              ),
              isSelected,
              isSelectAllChecked: isSelected,
            })
          : clearSelected({ id }),
      [setSelected, clearSelected, id, data, queryFields]
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
      return bulkActions.alertStatusActions ?? true;
    }, [hasAlertsCrud, selectedCount, showCheckboxes, bulkActions]);

    const alertToolbar = useMemo(
      () => (
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <AlertCount>{alertCountText}</AlertCount>
          </EuiFlexItem>
          {showBulkActions && (
            <Suspense fallback={<EuiLoadingSpinner />}>
              <StatefulAlertStatusBulkActions
                data-test-subj="bulk-actions"
                id={id}
                totalItems={totalItems}
                filterStatus={filterStatus}
                query={filterQuery}
                indexName={indexNames.join()}
                onActionSuccess={onAlertStatusActionSuccess}
                onActionFailure={onAlertStatusActionFailure}
                refetch={refetch}
              />
            </Suspense>
          )}
        </EuiFlexGroup>
      ),
      [
        alertCountText,
        filterQuery,
        filterStatus,
        id,
        indexNames,
        onAlertStatusActionFailure,
        onAlertStatusActionSuccess,
        refetch,
        showBulkActions,
        totalItems,
      ]
    );

    const toolbarVisibility: EuiDataGridToolBarVisibilityOptions = useMemo(
      () => ({
        additionalControls: (
          <>
            <AlertCount data-test-subj="server-side-event-count">{alertCountText}</AlertCount>
            {showBulkActions ? (
              <>
                <Suspense fallback={<EuiLoadingSpinner />}>
                  <StatefulAlertStatusBulkActions
                    data-test-subj="bulk-actions"
                    id={id}
                    totalItems={totalItems}
                    filterStatus={filterStatus}
                    query={filterQuery}
                    indexName={indexNames.join()}
                    onActionSuccess={onAlertStatusActionSuccess}
                    onActionFailure={onAlertStatusActionFailure}
                    refetch={refetch}
                  />
                </Suspense>
                {additionalControls ?? null}
              </>
            ) : (
              <>
                {additionalControls ?? null}
                <StatefulFieldsBrowser
                  data-test-subj="field-browser"
                  browserFields={browserFields}
                  timelineId={id}
                  columnHeaders={columnHeaders}
                />
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
              showColumnSelector: { allowHide: true, allowReorder: true },
              showSortSelector: true,
              showFullScreenSelector: true,
            }),
        showStyleSelector: false,
      }),
      [
        id,
        alertCountText,
        totalItems,
        filterStatus,
        filterQuery,
        browserFields,
        indexNames,
        columnHeaders,
        additionalControls,
        showBulkActions,
        onAlertStatusActionSuccess,
        onAlertStatusActionFailure,
        refetch,
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

    const [visibleColumns, setVisibleColumns] = useState(() =>
      columnHeaders.map(({ id: cid }) => cid)
    ); // initializes to the full set of columns

    useEffect(() => {
      setVisibleColumns(columnHeaders.map(({ id: cid }) => cid));
    }, [columnHeaders]);

    const setEventsLoading = useCallback<SetEventsLoading>(
      ({ eventIds, isLoading }) => {
        dispatch(tGridActions.setEventsLoading({ id, eventIds, isLoading }));
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
          isEventViewer,
          actionColumnsWidth: hasAdditionalActions(id as TimelineId)
            ? getActionsColumnWidth(
                isEventViewer,
                showCheckboxes,
                DEFAULT_ICON_BUTTON_WIDTH * NUM_OF_ICON_IN_TIMELINE_ROW + EXTRA_WIDTH
              )
            : controlColumns.reduce((acc, c) => acc + (c.width ?? MIN_ACTION_COLUMN_WIDTH), 0),
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
        })
      );
    }, [
      columnHeaders,
      data,
      id,
      isEventViewer,
      leadingControlColumns,
      loadingEventIds,
      onRowSelected,
      onRuleChange,
      selectedEventIds,
      showCheckboxes,
      tabType,
      trailingControlColumns,
      isSelectAllChecked,
      browserFields,
      onSelectPage,
      sort,
      theme,
      setEventsLoading,
      setEventsDeleted,
    ]);

    const columnsWithCellActions: EuiDataGridColumn[] = useMemo(
      () =>
        columnHeaders.map((header) => {
          const buildAction = (tGridCellAction: TGridCellAction) =>
            tGridCellAction({
              data: data.map((row) => row.data),
              browserFields,
            });

          return {
            ...header,
            cellActions:
              header.tGridCellActions?.map(buildAction) ?? defaultCellActions?.map(buildAction),
          };
        }),
      [browserFields, columnHeaders, data, defaultCellActions]
    );

    const renderTGridCellValue = useMemo(() => {
      const Cell: React.FC<EuiDataGridCellValueElementProps> = ({
        columnId,
        rowIndex,
        setCellProps,
      }): React.ReactElement | null => {
        const rowData = rowIndex < data.length ? data[rowIndex].data : null;
        const header = columnHeaders.find((h) => h.id === columnId);
        const eventId = rowIndex < data.length ? data[rowIndex]._id : null;

        useEffect(() => {
          addBuildingBlockStyle(data[rowIndex].ecs, theme, setCellProps);
        }, [rowIndex, setCellProps]);

        if (rowData == null || header == null || eventId == null) {
          return null;
        }

        return renderCellValue({
          columnId: header.id,
          eventId,
          data: rowData,
          header,
          isDraggable: false,
          isExpandable: true,
          isExpanded: false,
          isDetails: false,
          linkValues: getOr([], header.linkField ?? '', data[rowIndex].ecs),
          rowIndex,
          setCellProps,
          timelineId: tabType != null ? `${id}-${tabType}` : id,
          ecsData: data[rowIndex].ecs,
          browserFields,
          rowRenderers,
        }) as React.ReactElement;
      };
      return Cell;
    }, [columnHeaders, data, id, renderCellValue, tabType, theme, browserFields, rowRenderers]);

    return (
      <>
        {tableView === 'gridView' && (
          <EuiDataGrid
            data-test-subj="body-data-grid"
            aria-label={i18n.TGRID_BODY_ARIA_LABEL}
            columns={columnsWithCellActions}
            columnVisibility={{ visibleColumns, setVisibleColumns }}
            gridStyle={gridStyle}
            leadingControlColumns={leadingTGridControlColumns}
            trailingControlColumns={trailingTGridControlColumns}
            toolbarVisibility={toolbarVisibility}
            rowCount={data.length}
            renderCellValue={renderTGridCellValue}
            inMemory={{ level: 'sorting' }}
            sorting={{ columns: sortingColumns, onSort }}
          />
        )}
        {tableView === 'eventRenderedView' && (
          <EventRenderedView
            alertToolbar={alertToolbar}
            browserFields={browserFields}
            events={data}
            leadingControlColumns={leadingTGridControlColumns ?? []}
            onChangePage={loadPage}
            pageIndex={activePage}
            pageSize={querySize}
            pageSizeOptions={itemsPerPageOptions}
            rowRenderers={rowRenderers}
            timelineId={id}
            totalItemCount={totalItems}
          />
        )}
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
  const mapStateToProps = (
    state: TimelineState,
    { browserFields, id, hasAlertsCrud }: OwnProps
  ) => {
    const timeline: TGridModel = getTGrid(state, id);
    const {
      columns,
      excludedRowRendererIds,
      isSelectAllChecked,
      loadingEventIds,
      selectedEventIds,
      showCheckboxes,
      sort,
    } = timeline;

    return {
      columnHeaders: memoizedColumnHeaders(columns, browserFields),
      excludedRowRendererIds,
      isSelectAllChecked,
      loadingEventIds,
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
