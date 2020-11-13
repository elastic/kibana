/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { BrowserFields } from '../../../../../common/containers/source';
import {
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy/timeline';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { OnPinEvent, OnRowSelected } from '../../events';
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

interface Props {
  actionsColumnWidth: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  event: TimelineItem;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  isEventViewer?: boolean;
  isExpanded: boolean;
  loadingEventIds: Readonly<string[]>;
  onEventToggled: () => void;
  onRowSelected: OnRowSelected;
  isEventPinned: boolean;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  timelineId: string;
}

const emptyNotes: string[] = [];

const EventsTrSupplementContainerWrapper = React.memo(({ children }) => {
  const width = useEventDetailsWidthContext();
  return <EventsTrSupplementContainer width={width}>{children}</EventsTrSupplementContainer>;
});

EventsTrSupplementContainerWrapper.displayName = 'EventsTrSupplementContainerWrapper';

const StatefulEventComponent: React.FC<Props> = ({
  actionsColumnWidth,
  browserFields,
  columnHeaders,
  columnRenderers,
  event,
  eventIdToNoteIds,
  isEventViewer = false,
  isEventPinned = false,
  isExpanded = false,
  loadingEventIds,
  onEventToggled,
  onRowSelected,
  refetch,
  onRuleChange,
  rowRenderers,
  selectedEventIds,
  showCheckboxes,
  timelineId,
}) => {
  const dispatch = useDispatch();
  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});
  const divElement = useRef<HTMLDivElement | null>(null);

  const onToggleShowNotes = useCallback(() => {
    const eventId = event._id;
    setShowNotes((prevShowNotes) => ({ ...prevShowNotes, [eventId]: !prevShowNotes[eventId] }));
  }, [event]);

  const onPinEvent: OnPinEvent = useCallback(
    (eventId) => dispatch(timelineActions.pinEvent!({ id: timelineId, eventId })),
    [dispatch, timelineId]
  );

  const onUnPinEvent: OnPinEvent = useCallback(
    (eventId) => dispatch(timelineActions.unPinEvent!({ id: timelineId, eventId })),
    [dispatch, timelineId]
  );

  const associateNote = useCallback(
    (noteId: string) => {
      dispatch(timelineActions.addNoteToEvent({ eventId: event._id, id: timelineId, noteId }));
      if (!isEventPinned) {
        onPinEvent(event._id); // pin the event, because it has notes
      }
    },
    [dispatch, event, isEventPinned, onPinEvent, timelineId]
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
        isEventPinned={isEventPinned}
        isEventViewer={isEventViewer}
        loadingEventIds={loadingEventIds}
        onEventToggled={onEventToggled}
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
      />

      <EventsTrSupplementContainerWrapper>
        <EventsTrSupplement
          className="siemEventsTable__trSupplement--notes"
          data-test-subj="event-notes-flex-item"
        >
          <NoteCards
            associateNote={associateNote}
            data-test-subj="note-cards"
            noteIds={eventIdToNoteIds[event._id] || emptyNotes}
            showAddNote={!!showNotes[event._id]}
            toggleShowAddNote={onToggleShowNotes}
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
