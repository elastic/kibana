/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useRef, useCallback } from 'react';
import { VariableSizeList, areEqual } from 'react-window';

import { BrowserFields } from '../../../../common/containers/source';
import { TimelineItem, TimelineNonEcsData } from '../../../../graphql/types';
import { Note } from '../../../../common/lib/note';
import { ColumnHeaderOptions } from '../../../store/timeline/model';
import { AddNoteToEvent, UpdateNote } from '../../notes/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnFilterChange,
  OnPinEvent,
  OnRowSelected,
  OnSelectAll,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../events';
import { TimelineBodyGlobalStyle } from '../styles';
import { ColumnHeaders } from './column_headers';
import { getActionsColumnWidth } from './column_headers/helpers';
import { eventIsPinned } from './helpers';
import { ColumnRenderer } from './renderers/column_renderer';
import { RowRenderer } from './renderers/row_renderer';
import { Sort } from './sort';
import { useTimelineTypeContext } from '../timeline_context';
import { StatefulEvent } from './events/stateful_event';

export interface BodyProps {
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineItem[];
  getNotesByIds: (noteIds: string[]) => Note[];
  height: number;
  id: string;
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  loadingEventIds: Readonly<string[]>;
  onColumnRemoved: OnColumnRemoved;
  onColumnResized: OnColumnResized;
  onColumnSorted: OnColumnSorted;
  onRowSelected: OnRowSelected;
  onSelectAll: OnSelectAll;
  onFilterChange: OnFilterChange;
  onPinEvent: OnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  onUnPinEvent: OnUnPinEvent;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  sort: Sort;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  updateNote: UpdateNote;
}

const listRef = React.createRef<VariableSizeList>();

/** Renders the timeline body */
export const Body = React.memo<BodyProps>(
  ({
    addNoteToEvent,
    browserFields,
    columnHeaders,
    columnRenderers,
    data,
    eventIdToNoteIds,
    getNotesByIds,
    height,
    id,
    isEventViewer = false,
    isSelectAllChecked,
    loadingEventIds,
    onColumnRemoved,
    onColumnResized,
    onColumnSorted,
    onRowSelected,
    onSelectAll,
    onFilterChange,
    onPinEvent,
    onUpdateColumns,
    onUnPinEvent,
    pinnedEventIds,
    rowRenderers,
    selectedEventIds,
    showCheckboxes,
    sort,
    toggleColumn,
    updateNote,
  }) => {
    const timelineTypeContext = useTimelineTypeContext();
    const additionalActionWidth =
      timelineTypeContext.timelineActions?.reduce((acc, v) => acc + v.width, 0) ?? 0;

    const actionsColumnWidth = useMemo(
      () => getActionsColumnWidth(isEventViewer, showCheckboxes, additionalActionWidth),
      [isEventViewer, showCheckboxes, additionalActionWidth]
    );

    const columnWidths = useMemo(
      () =>
        columnHeaders.reduce((totalWidth, header) => totalWidth + header.width, actionsColumnWidth),
      [actionsColumnWidth, columnHeaders]
    );

    const rowHeights: number[] = [];

    const getItemSize = (index: number) => rowHeights[index] || 33;

    const Row = React.memo(({ index, style }) => {
      const ref = useRef();
      const event = data[index];
      const isEventPinned = eventIsPinned({
        eventId: event._id,
        pinnedEventIds,
      });

      const measure = useCallback(() => {
        if (ref && ref.current) {
          rowHeights[index] = ref.current.getBoundingClientRect().height;
          if (listRef.current) listRef.current.resetAfterIndex(index);
        }
      }, [ref]);

      return (
        <div style={{ ...style, top: style.top + 33, overflow: 'hidden' }}>
          <div ref={ref}>
            <StatefulEvent
              actionsColumnWidth={actionsColumnWidth}
              addNoteToEvent={addNoteToEvent}
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              columnRenderers={columnRenderers}
              event={event}
              eventIdToNoteIds={eventIdToNoteIds}
              getNotesByIds={getNotesByIds}
              isEventPinned={isEventPinned}
              isEventViewer={isEventViewer}
              key={event._id}
              loadingEventIds={loadingEventIds}
              onColumnResized={onColumnResized}
              onPinEvent={onPinEvent}
              onRowSelected={onRowSelected}
              onUnPinEvent={onUnPinEvent}
              onUpdateColumns={onUpdateColumns}
              rowRenderers={rowRenderers}
              selectedEventIds={selectedEventIds}
              showCheckboxes={showCheckboxes}
              timelineId={id}
              toggleColumn={toggleColumn}
              updateNote={updateNote}
              measure={measure}
            />
          </div>
        </div>
      );
    }, areEqual);

    const innerElementType = ({ children, style }) => (
      <div style={{ position: 'relative', minWidth: columnWidths }}>
        <ColumnHeaders
          actionsColumnWidth={actionsColumnWidth}
          browserFields={browserFields}
          columnHeaders={columnHeaders}
          isEventViewer={isEventViewer}
          isSelectAllChecked={isSelectAllChecked}
          onColumnRemoved={onColumnRemoved}
          onColumnResized={onColumnResized}
          onColumnSorted={onColumnSorted}
          onFilterChange={onFilterChange}
          onSelectAll={onSelectAll}
          onUpdateColumns={onUpdateColumns}
          showEventsSelect={false}
          showSelectAllCheckbox={showCheckboxes}
          sort={sort}
          timelineId={id}
          toggleColumn={toggleColumn}
        />
        <div style={style}>{children}</div>
      </div>
    );

    return (
      <>
        <VariableSizeList
          ref={listRef}
          height={height}
          itemCount={data.length}
          itemSize={getItemSize}
          innerElementType={innerElementType}
          width="100%"
          overscanCount={0}
        >
          {Row}
        </VariableSizeList>
        <TimelineBodyGlobalStyle />
      </>
    );
  }
);
Body.displayName = 'Body';
