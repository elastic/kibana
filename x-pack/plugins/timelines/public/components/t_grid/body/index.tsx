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
} from 'react';
import { connect, ConnectedProps, useDispatch } from 'react-redux';

import {
  TGridCellAction,
  TimelineId,
  TimelineTabs,
  BulkActionsProp,
  SortColumnTimeline,
} from '../../../../common/types/timeline';

import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRenderer,
  AlertStatus,
} from '../../../../common/types/timeline';
import type { TimelineItem, TimelineNonEcsData } from '../../../../common/search_strategy/timeline';

import { getActionsColumnWidth, getColumnHeaders } from './column_headers/helpers';
import { getEventIdToDataMapping, mapSortDirectionToDirection, mapSortingColumns } from './helpers';

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

const StatefulAlertStatusBulkActions = lazy(
  () => import('../toolbar/bulk_actions/alert_status_bulk_actions')
);

interface OwnProps {
  activePage: number;
  additionalControls?: React.ReactNode;
  browserFields: BrowserFields;
  data: TimelineItem[];
  defaultCellActions?: TGridCellAction[];
  id: string;
  isEventViewer?: boolean;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  tabType: TimelineTabs;
  leadingControlColumns?: ControlColumnProps[];
  loadPage: (newActivePage: number) => void;
  trailingControlColumns?: ControlColumnProps[];
  totalPages: number;
  totalItems: number;
  bulkActions?: BulkActionsProp;
  filterStatus?: AlertStatus;
  unit?: (total: number) => React.ReactNode;
  onRuleChange?: () => void;
  refetch: Refetch;
}

const basicUnit = (n: number) => i18n.UNIT(n);
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
      }: EuiDataGridCellValueElementProps) => (
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
        />
      ),
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
    columnHeaders,
    data,
    defaultCellActions,
    excludedRowRendererIds,
    id,
    isEventViewer = false,
    isSelectAllChecked,
    loadingEventIds,
    loadPage,
    selectedEventIds,
    setSelected,
    clearSelected,
    onRuleChange,
    showCheckboxes,
    renderCellValue,
    rowRenderers,
    sort,
    tabType,
    totalPages,
    totalItems,
    filterStatus,
    bulkActions = true,
    unit = basicUnit,
    leadingControlColumns = EMPTY_CONTROL_COLUMNS,
    trailingControlColumns = EMPTY_CONTROL_COLUMNS,
    refetch,
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
      if (selectedCount === 0 || !showCheckboxes) {
        return false;
      }
      if (typeof bulkActions === 'boolean') {
        return bulkActions;
      }
      return bulkActions.alertStatusActions ?? true;
    }, [selectedCount, showCheckboxes, bulkActions]);

    const toolbarVisibility: EuiDataGridToolBarVisibilityOptions = useMemo(
      () => ({
        additionalControls: (
          <>
            <AlertCount>{alertCountText}</AlertCount>
            {showBulkActions ? (
              <>
                <Suspense fallback={<EuiLoadingSpinner />}>
                  <StatefulAlertStatusBulkActions
                    data-test-subj="bulk-actions"
                    id={id}
                    totalItems={totalItems}
                    filterStatus={filterStatus}
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
        browserFields,
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

    const renderTGridCellValue: (x: EuiDataGridCellValueElementProps) => React.ReactNode = ({
      columnId,
      rowIndex,
      setCellProps,
    }) => {
      const rowData = rowIndex < data.length ? data[rowIndex].data : null;
      const header = columnHeaders.find((h) => h.id === columnId);
      const eventId = rowIndex < data.length ? data[rowIndex]._id : null;

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
      });
    };

    return (
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
  const mapStateToProps = (state: TimelineState, { browserFields, id }: OwnProps) => {
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
      showCheckboxes,
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

export const StatefulBody = connector(BodyComponent);
