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
  FIRST_ARIA_INDEX,
  ARIA_COLINDEX_ATTRIBUTE,
  ARIA_ROWINDEX_ATTRIBUTE,
  onKeyDownFocusHandler,
} from '../../../../../../timelines/public';
import { CellValueElementProps } from '../cell_rendering';
import { DEFAULT_COLUMN_MIN_WIDTH } from './constants';
import {
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRendererId,
  RowRenderer,
  TimelineId,
  TimelineTabs,
} from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';
import { TimelineItem } from '../../../../../common/search_strategy/timeline';
import { inputsModel, State } from '../../../../common/store';
import { TimelineModel } from '../../../store/timeline/model';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { OnRowSelected, OnSelectAll } from '../events';
import { getActionsColumnWidth, getColumnHeaders } from './column_headers/helpers';
import { getEventIdToDataMapping } from './helpers';
import { Sort } from './sort';
import { plainRowRenderer } from './renderers/plain_row_renderer';
import { EventsTable, TimelineBody, TimelineBodyGlobalStyle } from '../styles';
import { ColumnHeaders } from './column_headers';
import { Events } from './events';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../helpers';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';

interface OwnProps {
  activePage: number;
  browserFields: BrowserFields;
  data: TimelineItem[];
  id: string;
  isEventViewer?: boolean;
  sort: Sort[];
  refetch: inputsModel.Refetch;
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
    eventIdToNoteIds,
    excludedRowRendererIds,
    id,
    isEventViewer = false,
    isSelectAllChecked,
    loadingEventIds,
    pinnedEventIds,
    selectedEventIds,
    setSelected,
    clearSelected,
    onRuleChange,
    showCheckboxes,
    refetch,
    renderCellValue,
    rowRenderers,
    sort,
    tabType,
    totalPages,
    leadingControlColumns = [],
    trailingControlColumns = [],
  }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const getManageTimeline = useMemo(() => timelineSelectors.getManageTimelineById(), []);
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
              eventIdToNoteIds={eventIdToNoteIds}
              id={id}
              isEventViewer={isEventViewer}
              lastFocusedAriaColindex={lastFocusedAriaColindex}
              loadingEventIds={loadingEventIds}
              onRowSelected={onRowSelected}
              pinnedEventIds={pinnedEventIds}
              refetch={refetch}
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
    deepEqual(prevProps.eventIdToNoteIds, nextProps.eventIdToNoteIds) &&
    deepEqual(prevProps.pinnedEventIds, nextProps.pinnedEventIds) &&
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

  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State, { browserFields, id }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, id) ?? timelineDefaults;
    const {
      columns,
      eventIdToNoteIds,
      excludedRowRendererIds,
      isSelectAllChecked,
      loadingEventIds,
      pinnedEventIds,
      selectedEventIds,
      showCheckboxes,
    } = timeline;

    return {
      columnHeaders: memoizedColumnHeaders(columns, browserFields),
      eventIdToNoteIds,
      excludedRowRendererIds,
      isSelectAllChecked,
      loadingEventIds,
      id,
      pinnedEventIds,
      selectedEventIds,
      showCheckboxes,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  clearSelected: timelineActions.clearSelected,
  setSelected: timelineActions.setSelected,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulBody = connector(BodyComponent);
