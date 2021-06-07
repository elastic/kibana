/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import {
  ARIA_COLINDEX_ATTRIBUTE,
  ARIA_ROWINDEX_ATTRIBUTE,
  FIRST_ARIA_INDEX,
  onKeyDownFocusHandler,
} from '../../../../common';
import { DEFAULT_COLUMN_MIN_WIDTH } from './constants';
import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRenderer,
} from '../../../../common/types/timeline';
import { RowRendererId, TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import type { TimelineItem } from '../../../../common/search_strategy/timeline';

import { getActionsColumnWidth, getColumnHeaders } from './column_headers/helpers';
import { getEventIdToDataMapping } from './helpers';
import { Sort } from './sort';

import { EventsTable, TimelineBody, TimelineBodyGlobalStyle } from '../styles';
import { ColumnHeaders } from './column_headers';
import { Events } from './events';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../helpers';
import { BrowserFields } from '../../../../common/search_strategy/index_fields';
import { OnRowSelected, OnSelectAll } from '../types';
import { tGridActions } from '../../../types';
import { TGridModel, tGridSelectors, TimelineState } from '../../../store/t_grid';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { plainRowRenderer } from './renderers/plain_row_renderer';

interface OwnProps {
  activePage: number;
  browserFields: BrowserFields;
  data: TimelineItem[];
  id: string;
  isEventViewer?: boolean;
  sort: Sort[];
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  leadingControlColumns: ControlColumnProps[];
  trailingControlColumns: ControlColumnProps[];
  tabType: TimelineTabs;
  totalPages: number;
  onRuleChange?: () => void;
}

const NUM_OF_ICON_IN_TIMELINE_ROW = 2;

export const hasAdditionalActions = (id: TimelineId): boolean =>
  [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage, TimelineId.active].includes(
    id
  );

const EXTRA_WIDTH = 4; // px

export type StatefulBodyProps = OwnProps & PropsFromRedux;

/**
 * The Body component is used everywhere timeline is used within the security application. It is the highest level component
 * that is shared across all implementations of the timeline.
 */
export const BodyComponent = React.memo<StatefulBodyProps>(
  ({
    activePage,
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
    leadingControlColumns = [],
    trailingControlColumns = [],
  }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
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

    const enabledRowRenderers = useMemo(() => {
      if (
        excludedRowRendererIds &&
        excludedRowRendererIds.length === Object.keys(RowRendererId).length
      )
        return [plainRowRenderer];

      if (!excludedRowRendererIds) return rowRenderers;

      return rowRenderers.filter((rowRenderer) => !excludedRowRendererIds.includes(rowRenderer.id));
    }, [excludedRowRendererIds, rowRenderers]);

    const actionsColumnWidth = useMemo(
      () =>
        getActionsColumnWidth(
          isEventViewer,
          showCheckboxes,
          hasAdditionalActions(id as TimelineId)
            ? DEFAULT_ICON_BUTTON_WIDTH * NUM_OF_ICON_IN_TIMELINE_ROW + EXTRA_WIDTH
            : 0
        ),
      [isEventViewer, showCheckboxes, id]
    );

    const columnWidths = useMemo(
      () =>
        columnHeaders.reduce(
          (totalWidth, header) => totalWidth + (header.initialWidth ?? DEFAULT_COLUMN_MIN_WIDTH),
          0
        ),
      [columnHeaders]
    );

    const leadingActionColumnsWidth = useMemo(() => {
      return leadingControlColumns
        ? leadingControlColumns.reduce(
            (totalWidth, header) =>
              header.width ? totalWidth + header.width : totalWidth + actionsColumnWidth,
            0
          )
        : 0;
    }, [actionsColumnWidth, leadingControlColumns]);

    const trailingActionColumnsWidth = useMemo(() => {
      return trailingControlColumns
        ? trailingControlColumns.reduce(
            (totalWidth, header) =>
              header.width ? totalWidth + header.width : totalWidth + actionsColumnWidth,
            0
          )
        : 0;
    }, [actionsColumnWidth, trailingControlColumns]);

    const totalWidth = useMemo(() => {
      return columnWidths + leadingActionColumnsWidth + trailingActionColumnsWidth;
    }, [columnWidths, leadingActionColumnsWidth, trailingActionColumnsWidth]);

    const [lastFocusedAriaColindex] = useState(FIRST_ARIA_INDEX);

    const columnCount = useMemo(() => {
      return columnHeaders.length + trailingControlColumns.length + leadingControlColumns.length;
    }, [columnHeaders, trailingControlColumns, leadingControlColumns]);

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        onKeyDownFocusHandler({
          colindexAttribute: ARIA_COLINDEX_ATTRIBUTE,
          containerElement: containerRef.current,
          event: e,
          maxAriaColindex: columnHeaders.length + 1,
          maxAriaRowindex: data.length + 1,
          onColumnFocused: noop,
          rowindexAttribute: ARIA_ROWINDEX_ATTRIBUTE,
        });
      },
      [columnHeaders.length, containerRef, data.length]
    );
    return (
      <>
        <TimelineBody data-test-subj="timeline-body" ref={containerRef}>
          <EventsTable
            $activePage={activePage}
            $columnCount={columnCount}
            data-test-subj={`${tabType}-events-table`}
            columnWidths={totalWidth}
            onKeyDown={onKeyDown}
            $rowCount={data.length}
            $totalPages={totalPages}
          >
            <ColumnHeaders
              actionsColumnWidth={actionsColumnWidth}
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              isEventViewer={isEventViewer}
              isSelectAllChecked={isSelectAllChecked}
              onSelectAll={onSelectAll}
              showEventsSelect={false}
              showSelectAllCheckbox={showCheckboxes}
              sort={sort}
              tabType={tabType}
              timelineId={id}
              leadingControlColumns={leadingControlColumns}
              trailingControlColumns={trailingControlColumns}
            />

            <Events
              containerRef={containerRef}
              actionsColumnWidth={actionsColumnWidth}
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              data={data}
              id={id}
              isEventViewer={isEventViewer}
              lastFocusedAriaColindex={lastFocusedAriaColindex}
              loadingEventIds={loadingEventIds}
              onRowSelected={onRowSelected}
              renderCellValue={renderCellValue}
              rowRenderers={enabledRowRenderers}
              onRuleChange={onRuleChange}
              selectedEventIds={selectedEventIds}
              showCheckboxes={showCheckboxes}
              leadingControlColumns={leadingControlColumns}
              trailingControlColumns={trailingControlColumns}
              tabType={tabType}
            />
          </EventsTable>
        </TimelineBody>
        <TimelineBodyGlobalStyle />
      </>
    );
  },
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.columnHeaders, nextProps.columnHeaders) &&
    deepEqual(prevProps.data, nextProps.data) &&
    deepEqual(prevProps.excludedRowRendererIds, nextProps.excludedRowRendererIds) &&
    deepEqual(prevProps.sort, nextProps.sort) &&
    deepEqual(prevProps.selectedEventIds, nextProps.selectedEventIds) &&
    deepEqual(prevProps.loadingEventIds, nextProps.loadingEventIds) &&
    prevProps.id === nextProps.id &&
    prevProps.isEventViewer === nextProps.isEventViewer &&
    prevProps.isSelectAllChecked === nextProps.isSelectAllChecked &&
    prevProps.renderCellValue === nextProps.renderCellValue &&
    prevProps.rowRenderers === nextProps.rowRenderers &&
    prevProps.showCheckboxes === nextProps.showCheckboxes &&
    prevProps.tabType === nextProps.tabType
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
