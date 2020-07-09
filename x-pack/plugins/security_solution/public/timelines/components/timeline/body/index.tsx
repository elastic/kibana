/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useRef } from 'react';

import { BrowserFields } from '../../../../common/containers/source';
import { TimelineItem, TimelineNonEcsData } from '../../../../graphql/types';
import { Note } from '../../../../common/lib/note';
import { ColumnHeaderOptions } from '../../../../timelines/store/timeline/model';
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
import { EventsTable, TimelineBody, TimelineBodyGlobalStyle } from '../styles';
import { ColumnHeaders } from './column_headers';
import { getActionsColumnWidth } from './column_headers/helpers';
import { Events } from './events';
import { showGraphView } from './helpers';
import { ColumnRenderer } from './renderers/column_renderer';
import { RowRenderer } from './renderers/row_renderer';
import { Sort } from './sort';
import { useManageTimeline } from '../../manage_timeline';
import { GraphOverlay } from '../../graph_overlay';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../helpers';

export interface BodyProps {
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineItem[];
  getNotesByIds: (noteIds: string[]) => Note[];
  graphEventId?: string;
  height?: number;
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
  show: boolean;
  showCheckboxes: boolean;
  sort: Sort;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  updateNote: UpdateNote;
}

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
    graphEventId,
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
    show,
    showCheckboxes,
    sort,
    toggleColumn,
    updateNote,
  }) => {
    const containerElementRef = useRef<HTMLDivElement>(null);
    const { getManageTimelineById } = useManageTimeline();
    const timelineActions = useMemo(
      () => (data.length > 0 ? getManageTimelineById(id).timelineRowActions(data[0].ecs) : []),
      [data, getManageTimelineById, id]
    );

    const additionalActionWidth = useMemo(() => {
      let hasContextMenu = false;
      return (
        timelineActions.reduce((acc, v) => {
          if (v.displayType === 'icon') {
            return acc + (v.width ?? 0);
          }
          const addWidth = hasContextMenu ? 0 : DEFAULT_ICON_BUTTON_WIDTH;
          hasContextMenu = true;
          return acc + addWidth;
        }, 0) ?? 0
      );
    }, [timelineActions]);
    const actionsColumnWidth = useMemo(
      () => getActionsColumnWidth(isEventViewer, showCheckboxes, additionalActionWidth),
      [isEventViewer, showCheckboxes, additionalActionWidth]
    );

    const columnWidths = useMemo(
      () =>
        columnHeaders.reduce((totalWidth, header) => totalWidth + header.width, actionsColumnWidth),
      [actionsColumnWidth, columnHeaders]
    );

    return (
      <>
        {showGraphView(graphEventId) && (
          <GraphOverlay bodyHeight={height} graphEventId={graphEventId} timelineId={id} />
        )}
        <TimelineBody
          data-test-subj="timeline-body"
          data-timeline-id={id}
          bodyHeight={height}
          ref={containerElementRef}
          visible={show && !showGraphView(graphEventId)}
        >
          <EventsTable data-test-subj="events-table" columnWidths={columnWidths}>
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

            <Events
              containerElementRef={containerElementRef.current!}
              actionsColumnWidth={actionsColumnWidth}
              addNoteToEvent={addNoteToEvent}
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              columnRenderers={columnRenderers}
              data={data}
              eventIdToNoteIds={eventIdToNoteIds}
              getNotesByIds={getNotesByIds}
              id={id}
              isEventViewer={isEventViewer}
              loadingEventIds={loadingEventIds}
              onColumnResized={onColumnResized}
              onPinEvent={onPinEvent}
              onRowSelected={onRowSelected}
              onUpdateColumns={onUpdateColumns}
              onUnPinEvent={onUnPinEvent}
              pinnedEventIds={pinnedEventIds}
              rowRenderers={rowRenderers}
              selectedEventIds={selectedEventIds}
              showCheckboxes={showCheckboxes}
              toggleColumn={toggleColumn}
              updateNote={updateNote}
            />
          </EventsTable>
        </TimelineBody>
        <TimelineBodyGlobalStyle />
      </>
    );
  }
);
Body.displayName = 'Body';
