/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState, useCallback } from 'react';
import uuid from 'uuid';

import { BrowserFields, DocValueFields } from '../../../../../common/containers/source';
import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { useTimelineEventsDetails } from '../../../../containers/details';
import {
  TimelineEventsDetailsItem,
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy/timeline';
import { Note } from '../../../../../common/lib/note';
import { ColumnHeaderOptions, TimelineModel } from '../../../../../timelines/store/timeline/model';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import {
  OnColumnResized,
  OnPinEvent,
  OnRowSelected,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../../events';
import { ExpandableEvent } from '../../expandable_event';
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
import { TimelineId } from '../../../../../../common/types/timeline';
import { activeTimeline } from '../../../../containers/active_timeline_context';

interface Props {
  actionsColumnWidth: number;
  containerElementRef: HTMLDivElement;
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  docValueFields: DocValueFields[];
  event: TimelineItem;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  getNotesByIds: (noteIds: string[]) => Note[];
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onRowSelected: OnRowSelected;
  onUnPinEvent: OnUnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  isEventPinned: boolean;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  updateNote: UpdateNote;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyDetails: TimelineEventsDetailsItem[] = [];

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
  containerElementRef,
  columnHeaders,
  columnRenderers,
  docValueFields,
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
  refetch,
  onRuleChange,
  rowRenderers,
  selectedEventIds,
  showCheckboxes,
  timelineId,
  toggleColumn,
  updateNote,
}) => {
  const [expanded, setExpanded] = useState<{ [eventId: string]: boolean }>(
    timelineId === TimelineId.active ? activeTimeline.getExpandedEventIds() : {}
  );
  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});
  const { status: timelineStatus } = useShallowEqualSelector<TimelineModel>(
    (state) => state.timeline.timelineById[timelineId]
  );
  const divElement = useRef<HTMLDivElement | null>(null);
  const [loading, detailsData] = useTimelineEventsDetails({
    docValueFields,
    indexName: event._index!,
    eventId: event._id,
    skip: !expanded || !expanded[event._id],
  });

  const onToggleShowNotes = useCallback(() => {
    const eventId = event._id;
    setShowNotes((prevShowNotes) => ({ ...prevShowNotes, [eventId]: !prevShowNotes[eventId] }));
  }, [event]);

  const onToggleExpanded = useCallback(() => {
    const eventId = event._id;
    setExpanded((prevExpanded) => ({ ...prevExpanded, [eventId]: !prevExpanded[eventId] }));
    if (timelineId === TimelineId.active) {
      activeTimeline.toggleExpandedEvent(eventId);
    }
  }, [event._id, timelineId]);

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

        <EventsTrSupplement
          className="siemEventsTable__trSupplement--attributes"
          data-test-subj="event-details"
        >
          <ExpandableEvent
            browserFields={browserFields}
            columnHeaders={columnHeaders}
            event={detailsData || emptyDetails}
            forceExpand={!!expanded[event._id] && !loading}
            id={event._id}
            onEventToggled={onToggleExpanded}
            onUpdateColumns={onUpdateColumns}
            timelineId={timelineId}
            toggleColumn={toggleColumn}
          />
        </EventsTrSupplement>
      </EventsTrSupplementContainerWrapper>
    </EventsTrGroup>
  );
};

export const StatefulEvent = React.memo(StatefulEventComponent);
