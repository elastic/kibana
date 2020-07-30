/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useRef } from 'react';

import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
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
import { ColumnRenderer } from './renderers/column_renderer';
import { RowRenderer } from './renderers/row_renderer';
import { Sort } from './sort';
import { GraphOverlay } from '../../graph_overlay';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../helpers';
import { TimelineId, TimelineType } from '../../../../../common/types/timeline';

export interface BodyProps {
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineItem[];
  docValueFields: DocValueFields[];
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
  timelineType: TimelineType;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  updateNote: UpdateNote;
}

export const hasAdditonalActions = (id: string): boolean =>
  id === TimelineId.detectionsPage || id === TimelineId.detectionsRulesDetailsPage;

const EXTRA_WIDTH = 4; // px

/** Renders the timeline body */
export const Body = React.memo<BodyProps>(
  ({
    addNoteToEvent,
    browserFields,
    columnHeaders,
    columnRenderers,
    data,
    docValueFields,
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
    timelineType,
    updateNote,
  }) => {
    const containerElementRef = useRef<HTMLDivElement>(null);
    const actionsColumnWidth = useMemo(
      () =>
        getActionsColumnWidth(
          isEventViewer,
          showCheckboxes,
          hasAdditonalActions(id) ? DEFAULT_ICON_BUTTON_WIDTH + EXTRA_WIDTH : 0
        ),
      [isEventViewer, showCheckboxes, id]
    );

    const columnWidths = useMemo(
      () =>
        columnHeaders.reduce((totalWidth, header) => totalWidth + header.width, actionsColumnWidth),
      [actionsColumnWidth, columnHeaders]
    );

    return (
      <>
        {graphEventId && (
          <GraphOverlay
            bodyHeight={height}
            graphEventId={graphEventId}
            timelineId={id}
            timelineType={timelineType}
          />
        )}
        <TimelineBody
          data-test-subj="timeline-body"
          data-timeline-id={id}
          bodyHeight={height}
          ref={containerElementRef}
          visible={show && !graphEventId}
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
              docValueFields={docValueFields}
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
