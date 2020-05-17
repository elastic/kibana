/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useCallback } from 'react';
import uuid from 'uuid';

import { useEventDetailsWidthContext } from '../../../../../common/components/events_viewer/event_details_width_context';
import { StatefulEventDetails } from '../../../../../common/event_details/stateful_event_details';
import { BrowserFields } from '../../../../../common/containers/source';
import { TimelineDetailsQuery } from '../../../../containers/details';
import { TimelineItem, DetailItem, TimelineNonEcsData } from '../../../../../graphql/types';
import { Note } from '../../../../../common/lib/note';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import {
  OnColumnResized,
  OnPinEvent,
  OnRowSelected,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../../events';
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../helpers';
import { EventsTrGroup, EventsTrSupplement, EventsTrSupplementContainer } from '../../styles';
import { ColumnRenderer } from '../renderers/column_renderer';
import { getRowRenderer } from '../renderers/get_row_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { getEventType } from '../helpers';
import { NoteCards } from '../../../notes/note_cards';
import { EventColumnView } from './event_column_view';

interface Props {
  actionsColumnWidth: number;
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  event: TimelineItem;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  getNotesByIds: (noteIds: string[]) => Note[];
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  maxDelay?: number;
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onRowSelected: OnRowSelected;
  onUnPinEvent: OnUnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  isEventPinned: boolean;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  updateNote: UpdateNote;
  measure: () => void;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyDetails: DetailItem[] = [];

const emptyNotes: string[] = [];

const EventsTrSupplementContainerWrapper = React.memo(({ children }) => {
  const width = useEventDetailsWidthContext();
  return <EventsTrSupplementContainer width={width}>{children}</EventsTrSupplementContainer>;
});

EventsTrSupplementContainerWrapper.displayName = 'EventsTrSupplementContainerWrapper';

// const MeasureComponent = ({ measure }: { measure: () => void }) => {
//   useEffect(() => measure(), []);
//   return null;
// };

const StatefulEventComponent: React.FC<Props> = ({
  actionsColumnWidth,
  addNoteToEvent,
  browserFields,
  columnHeaders,
  columnRenderers,
  event,
  eventIdToNoteIds,
  getNotesByIds,
  isEventViewer = false,
  isEventPinned = false,
  loadingEventIds,
  onColumnResized,
  onPinEvent,
  onRowSelected,
  onUnPinEvent,
  onUpdateColumns,
  rowRenderers,
  selectedEventIds,
  showCheckboxes,
  timelineId,
  toggleColumn,
  updateNote,
  measure,
}) => {
  const [expanded, setExpanded] = useState<{ [eventId: string]: boolean }>({});
  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});

  const onToggleShowNotes = useCallback(() => {
    const eventId = event._id;
    setShowNotes({ ...showNotes, [eventId]: !showNotes[eventId] });
  }, [event, showNotes]);

  const onToggleExpanded = useCallback(() => {
    const eventId = event._id;
    setExpanded({
      ...expanded,
      [eventId]: !expanded[eventId],
    });
  }, [event, expanded]);

  const associateNote = useCallback(
    (noteId: string) => {
      addNoteToEvent({ eventId: event._id, noteId });
      if (!isEventPinned) {
        onPinEvent(event._id); // pin the event, because it has notes
      }
    },
    [addNoteToEvent, event, isEventPinned, onPinEvent]
  );

  return (
    <TimelineDetailsQuery
      sourceId="default"
      indexName={event._index!}
      eventId={event._id}
      executeQuery={!!expanded[event._id]}
    >
      {({ detailsData, loading }) => (
        <EventsTrGroup
          className={STATEFUL_EVENT_CSS_CLASS_NAME}
          data-test-subj="event"
          eventType={getEventType(event.ecs)}
          showLeftBorder={!isEventViewer}
        >
          <EventColumnView
            id={event._id}
            actionsColumnWidth={actionsColumnWidth}
            associateNote={associateNote}
            columnHeaders={columnHeaders}
            columnRenderers={columnRenderers}
            data={event.data}
            ecsData={event.ecs}
            expanded={!!expanded[event._id]}
            eventIdToNoteIds={eventIdToNoteIds}
            getNotesByIds={getNotesByIds}
            isEventPinned={isEventPinned}
            isEventViewer={isEventViewer}
            loading={loading}
            loadingEventIds={loadingEventIds}
            onColumnResized={onColumnResized}
            onEventToggled={onToggleExpanded}
            onPinEvent={onPinEvent}
            onRowSelected={onRowSelected}
            onUnPinEvent={onUnPinEvent}
            selectedEventIds={selectedEventIds}
            showCheckboxes={showCheckboxes}
            showNotes={!!showNotes[event._id]}
            timelineId={timelineId}
            toggleShowNotes={onToggleShowNotes}
            updateNote={updateNote}
          />

          <EventsTrSupplementContainerWrapper>
            <EventsTrSupplement
              className="siemEventsTable__trSupplement--notes"
              data-test-subj="event-notes-flex-item"
            >
              <NoteCards
                associateNote={associateNote}
                data-test-subj="note-cards"
                getNewNoteId={getNewNoteId}
                getNotesByIds={getNotesByIds}
                noteIds={eventIdToNoteIds[event._id] || emptyNotes}
                showAddNote={!!showNotes[event._id]}
                toggleShowAddNote={onToggleShowNotes}
                updateNote={updateNote}
              />
            </EventsTrSupplement>

            {getRowRenderer(event.ecs, rowRenderers).renderRow({
              browserFields,
              data: event.ecs,
              timelineId,
            })}

            <EventsTrSupplement
              className="siemEventsTable__trSupplement--attributes"
              data-test-subj="event-details"
            >
              <StatefulEventDetails
                browserFields={browserFields}
                columnHeaders={columnHeaders}
                event={detailsData || emptyDetails}
                forceExpand={!!expanded[event._id] && !loading}
                id={event._id}
                onUpdateColumns={onUpdateColumns}
                timelineId={timelineId}
                toggleColumn={toggleColumn}
              />
            </EventsTrSupplement>
          </EventsTrSupplementContainerWrapper>
        </EventsTrGroup>
      )}
    </TimelineDetailsQuery>
  );
};

export const StatefulEvent = React.memo(StatefulEventComponent);
