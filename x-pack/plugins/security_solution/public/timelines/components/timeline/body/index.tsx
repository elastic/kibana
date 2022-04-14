/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop, isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  FIRST_ARIA_INDEX,
  ARIA_COLINDEX_ATTRIBUTE,
  ARIA_ROWINDEX_ATTRIBUTE,
  onKeyDownFocusHandler,
  getActionsColumnWidth,
} from '../../../../../../timelines/public';
import { CellValueElementProps } from '../cell_rendering';
import { DEFAULT_COLUMN_MIN_WIDTH } from './constants';
import {
  ControlColumnProps,
  RowRendererId,
  RowRenderer,
  TimelineId,
  TimelineTabs,
} from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';
import { TimelineItem } from '../../../../../common/search_strategy/timeline';
import { inputsModel, State } from '../../../../common/store';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { timelineActions } from '../../../store/timeline';
import { OnRowSelected, OnSelectAll } from '../events';
import { getColumnHeaders } from './column_headers/helpers';
import { getEventIdToDataMapping } from './helpers';
import { Sort } from './sort';
import { plainRowRenderer } from './renderers/plain_row_renderer';
import { EventsTable, TimelineBody, TimelineBodyGlobalStyle } from '../styles';
import { ColumnHeaders } from './column_headers';
import { Events } from './events';
import { timelineBodySelector } from './selectors';

export interface Props {
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

export const hasAdditionalActions = (id: TimelineId): boolean =>
  [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage, TimelineId.active].includes(
    id
  );

/**
 * The Body component is used everywhere timeline is used within the security application. It is the highest level component
 * that is shared across all implementations of the timeline.
 */
export const StatefulBody = React.memo<Props>(
  ({
    activePage,
    browserFields,
    data,
    id,
    isEventViewer = false,
    onRuleChange,
    refetch,
    renderCellValue,
    rowRenderers,
    sort,
    tabType,
    totalPages,
    leadingControlColumns = [],
    trailingControlColumns = [],
  }) => {
    const dispatch = useDispatch();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const {
      manageTimelineById: { queryFields, selectAll },
      timeline: {
        columns,
        eventIdToNoteIds,
        excludedRowRendererIds,
        isSelectAllChecked,
        loadingEventIds,
        pinnedEventIds,
        selectedEventIds,
        showCheckboxes,
        show,
      } = timelineDefaults,
    } = useSelector((state: State) => timelineBodySelector(state, id));

    const columnHeaders = useMemo(
      () => getColumnHeaders(columns, browserFields),
      [browserFields, columns]
    );
    const ACTION_BUTTON_COUNT = 6;

    const onRowSelected: OnRowSelected = useCallback(
      ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
        dispatch(
          timelineActions.setSelected({
            id,
            eventIds: getEventIdToDataMapping(data, eventIds, queryFields),
            isSelected,
            isSelectAllChecked:
              isSelected && Object.keys(selectedEventIds).length + 1 === data.length,
          })
        );
      },
      [data, dispatch, id, queryFields, selectedEventIds]
    );

    const onSelectAll: OnSelectAll = useCallback(
      ({ isSelected }: { isSelected: boolean }) =>
        isSelected
          ? dispatch(
              timelineActions.setSelected({
                id,
                eventIds: getEventIdToDataMapping(
                  data,
                  data.map((event) => event._id),
                  queryFields
                ),
                isSelected,
                isSelectAllChecked: isSelected,
              })
            )
          : dispatch(timelineActions.clearSelected({ id })),
      [data, dispatch, id, queryFields]
    );

    // Sync to selectAll so parent components can select all events
    useEffect(() => {
      if (selectAll && !isSelectAllChecked) {
        onSelectAll({ isSelected: true });
      }
    }, [isSelectAllChecked, onSelectAll, selectAll]);

    useEffect(() => {
      if (!isEmpty(browserFields) && !isEmpty(columnHeaders)) {
        columnHeaders.forEach(({ id: columnId }) => {
          if (browserFields.base?.fields?.[columnId] == null) {
            const [category] = columnId.split('.');
            if (browserFields[category]?.fields?.[columnId] == null) {
              dispatch(timelineActions.removeColumn({ id, columnId }));
            }
          }
        });
      }
    }, [browserFields, columnHeaders, dispatch, id]);

    const enabledRowRenderers = useMemo(() => {
      if (
        excludedRowRendererIds &&
        excludedRowRendererIds.length === Object.keys(RowRendererId).length
      )
        return [plainRowRenderer];

      if (!excludedRowRendererIds) return rowRenderers;

      return rowRenderers.filter((rowRenderer) => !excludedRowRendererIds.includes(rowRenderer.id));
    }, [excludedRowRendererIds, rowRenderers]);

    const actionsColumnWidth = useMemo(() => getActionsColumnWidth(ACTION_BUTTON_COUNT), []);

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
              show={show}
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
  }
);

StatefulBody.displayName = 'StatefulBody';
