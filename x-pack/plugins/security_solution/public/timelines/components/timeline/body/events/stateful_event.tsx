/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useRef, useState, useCallback } from 'react';
import uuid from 'uuid';
import { useDispatch } from 'react-redux';

import { TimelineId } from '../../../../../../common/types/timeline';
import { BrowserFields } from '../../../../../common/containers/source';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import {
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy/timeline';
import { Note } from '../../../../../common/lib/note';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import { OnColumnResized, OnPinEvent, OnRowSelected, OnUnPinEvent } from '../../events';
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../helpers';
import { EventsTrGroup, EventsTrSupplement, EventsTrSupplementContainer } from '../../styles';
import { ColumnRenderer } from '../renderers/column_renderer';
import { getRowRenderer } from '../renderers/get_row_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { isEventBuildingBlockType, getEventType } from '../helpers';
import { NoteCards } from '../../../notes/note_cards';
import { useEventDetailsWidthContext } from '../../../../../common/components/events_viewer/event_details_width_context';
import { EventColumnView } from './event_column_view';
import { inputsModel } from '../../../../../common/store';
import { timelineActions } from '../../../../store/timeline';
import { activeTimeline } from '../../../../containers/active_timeline_context';

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
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onRowSelected: OnRowSelected;
  onUnPinEvent: OnUnPinEvent;
  isEventPinned: boolean;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  timelineId: string;
  updateNote: UpdateNote;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyNotes: string[] = [];

const EventsTrSupplementContainerWrapper = React.memo(({ children }) => {
  const width = useEventDetailsWidthContext();
  return <EventsTrSupplementContainer width={width}>{children}</EventsTrSupplementContainer>;
});

EventsTrSupplementContainerWrapper.displayName = 'EventsTrSupplementContainerWrapper';

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
  refetch,
  onRuleChange,
  rowRenderers,
  selectedEventIds,
  showCheckboxes,
  timelineId,
  updateNote,
}) => {
  const dispatch = useDispatch();
  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});
  const { expandedEvent, status: timelineStatus } = useDeepEqualSelector(
    (state) => state.timeline.timelineById[timelineId]
  );
  const divElement = useRef<HTMLDivElement | null>(null);

  const isExpanded = useMemo(() => expandedEvent && expandedEvent.eventId === event._id, [
    event._id,
    expandedEvent,
  ]);

  const onToggleShowNotes = useCallback(() => {
    const eventId = event._id;
    setShowNotes((prevShowNotes) => ({ ...prevShowNotes, [eventId]: !prevShowNotes[eventId] }));
  }, [event]);

  const handleOnEventToggled = useCallback(() => {
    const eventId = event._id;
    const indexName = event._index!;

    dispatch(
      timelineActions.toggleExpandedEvent({
        timelineId,
        event: {
          eventId,
          indexName,
          loading: false,
        },
      })
    );

    if (timelineId === TimelineId.active) {
      activeTimeline.toggleExpandedEvent({ eventId, indexName, loading: false });
    }
  }, [dispatch, event._id, event._index, timelineId]);

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
    <EventsTrGroup
      className={STATEFUL_EVENT_CSS_CLASS_NAME}
      data-test-subj="event"
      eventType={getEventType(event.ecs)}
      isBuildingBlockType={isEventBuildingBlockType(event.ecs)}
      isExpanded={isExpanded}
      showLeftBorder={!isEventViewer}
      ref={divElement}
    >
      <EventColumnView
        id={event._id}
        actionsColumnWidth={actionsColumnWidth}
        associateNote={associateNote}
        columnHeaders={columnHeaders}
        columnRenderers={columnRenderers}
        data={event.data}
        ecsData={event.ecs}
        eventIdToNoteIds={eventIdToNoteIds}
        expanded={isExpanded}
        getNotesByIds={getNotesByIds}
        isEventPinned={isEventPinned}
        isEventViewer={isEventViewer}
        loadingEventIds={loadingEventIds}
        onColumnResized={onColumnResized}
        onEventToggled={handleOnEventToggled}
        onPinEvent={onPinEvent}
        onRowSelected={onRowSelected}
        onUnPinEvent={onUnPinEvent}
        refetch={refetch}
        onRuleChange={onRuleChange}
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
            status={timelineStatus}
            toggleShowAddNote={onToggleShowNotes}
            updateNote={updateNote}
          />
        </EventsTrSupplement>

        {getRowRenderer(event.ecs, rowRenderers).renderRow({
          browserFields,
          data: event.ecs,
          timelineId,
        })}
      </EventsTrSupplementContainerWrapper>
    </EventsTrGroup>
  );
};

export const StatefulEvent = React.memo(StatefulEventComponent);
