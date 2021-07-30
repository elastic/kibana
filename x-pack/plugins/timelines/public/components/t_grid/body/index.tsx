/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridControlColumn,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React, { ComponentType, useCallback, useEffect, useMemo, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRenderer,
} from '../../../../common/types/timeline';
import type { TimelineItem, TimelineNonEcsData } from '../../../../common/search_strategy/timeline';

import { getActionsColumnWidth, getColumnHeaders } from './column_headers/helpers';
import { getEventIdToDataMapping } from './helpers';
import { Sort } from './sort';

import { DEFAULT_ICON_BUTTON_WIDTH } from '../helpers';
import { BrowserFields } from '../../../../common/search_strategy/index_fields';
import { OnRowSelected, OnSelectAll } from '../types';
import { StatefulFieldsBrowser, tGridActions } from '../../../';
import { TGridModel, tGridSelectors, TimelineState } from '../../../store/t_grid';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { RowAction } from './row_action';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from '../toolbar/fields_browser/helpers';
import * as i18n from './translations';

interface OwnProps {
  activePage: number;
  additionalControls?: React.ReactNode;
  browserFields: BrowserFields;
  data: TimelineItem[];
  id: string;
  isEventViewer?: boolean;
  leadingControlColumns: ControlColumnProps[];
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  sort: Sort[];
  tabType: TimelineTabs;
  trailingControlColumns: ControlColumnProps[];
  totalPages: number;
  onRuleChange?: () => void;
}

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
}): EuiDataGridControlColumn[] =>
  controlColumns.map(
    ({ id: columnId, headerCellRender = EmptyHeaderCellRender, rowCellRender, width }, i) => ({
      id: `${columnId}`,
      headerCellRender: headerCellRender as ComponentType,
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
      width: actionColumnsWidth,
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
    excludedRowRendererIds,
    id,
    isEventViewer = false,
    isSelectAllChecked,
    loadingEventIds,
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
    leadingControlColumns = EMPTY_CONTROL_COLUMNS,
    trailingControlColumns = EMPTY_CONTROL_COLUMNS,
  }) => {
    const getManageTimeline = useMemo(() => tGridSelectors.getManageTimelineById(), []);
    const { queryFields, selectAll } = useDeepEqualSelector((state) =>
      getManageTimeline(state, id)
    );

    const onRowSelected: OnRowSelected = useCallback(
      ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
        setSelected!({
          id,
          eventIds: getEventIdToDataMapping(data, eventIds, queryFields),
          isSelected,
          isSelectAllChecked:
            isSelected && Object.keys(selectedEventIds).length + 1 === data.length,
        });
      },
      [setSelected, id, data, selectedEventIds, queryFields]
    );

    const onSelectAll: OnSelectAll = useCallback(
      ({ isSelected }: { isSelected: boolean }) =>
        isSelected
          ? setSelected!({
              id,
              eventIds: getEventIdToDataMapping(
                data,
                data.map((event) => event._id),
                queryFields
              ),
              isSelected,
              isSelectAllChecked: isSelected,
            })
          : clearSelected!({ id }),
      [setSelected, clearSelected, id, data, queryFields]
    );

    // Sync to selectAll so parent components can select all events
    useEffect(() => {
      if (selectAll && !isSelectAllChecked) {
        onSelectAll({ isSelected: true });
      }
    }, [isSelectAllChecked, onSelectAll, selectAll]);

    const toolbarVisibility: EuiDataGridToolBarVisibilityOptions = useMemo(
      () => ({
        additionalControls: (
          <>
            {additionalControls ?? null}
            {
              <StatefulFieldsBrowser
                data-test-subj="field-browser"
                height={FIELD_BROWSER_HEIGHT}
                width={FIELD_BROWSER_WIDTH}
                browserFields={browserFields}
                timelineId={id}
                columnHeaders={columnHeaders}
              />
            }
          </>
        ),
        showColumnSelector: { allowHide: false, allowReorder: true },
        showStyleSelector: false,
      }),
      [additionalControls, browserFields, columnHeaders, id]
    );

    const [sortingColumns, setSortingColumns] = useState([]);

    const onSort = useCallback(
      (columns) => {
        setSortingColumns(columns);
      },
      [setSortingColumns]
    );

    const [visibleColumns, setVisibleColumns] = useState(() =>
      columnHeaders.map(({ id: cid }) => cid)
    ); // initializes to the full set of columns

    useEffect(() => {
      setVisibleColumns(columnHeaders.map(({ id: cid }) => cid));
    }, [columnHeaders]);

    const [leadingTGridControlColumns, trailingTGridControlColumns] = useMemo(
      () =>
        [leadingControlColumns, trailingControlColumns].map((controlColumns) =>
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
          })
        ),
      [
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
      ]
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
        columns={columnHeaders}
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
    } = timeline;

    return {
      columnHeaders: memoizedColumnHeaders(columns, browserFields),
      excludedRowRendererIds,
      isSelectAllChecked,
      loadingEventIds,
      id,
      selectedEventIds,
      showCheckboxes,
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
