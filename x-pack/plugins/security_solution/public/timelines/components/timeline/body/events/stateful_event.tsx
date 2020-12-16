/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { TimelineId } from '../../../../../../common/types/timeline';
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

import { RowRenderer } from '../renderers/row_renderer';
import { isEventBuildingBlockType, getEventType } from '../helpers';
import { NoteCards } from '../../../notes/note_cards';
import { useEventDetailsWidthContext } from '../../../../../common/components/events_viewer/event_details_width_context';
import { EventColumnView } from './event_column_view';
import { inputsModel } from '../../../../../common/store';
import { timelineActions, timelineSelectors } from '../../../../store/timeline';
import { activeTimeline } from '../../../../containers/active_timeline_context';
import { StatefulRowRenderer } from './stateful_row_renderer';
import { NOTES_BUTTON_CLASS_NAME } from '../../properties/helpers';
import { timelineDefaults } from '../../../../store/timeline/defaults';

interface Props {
  actionsColumnWidth: number;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  event: TimelineItem;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  isEventViewer?: boolean;
  lastFocusedAriaColindex: number;
  loadingEventIds: Readonly<string[]>;
  onRowSelected: OnRowSelected;
  isEventPinned: boolean;
  refetch: inputsModel.Refetch;
  ariaRowindex: number;
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
  containerRef,
  columnHeaders,
  columnRenderers,
  event,
  eventIdToNoteIds,
  isEventViewer = false,
  isEventPinned = false,
  lastFocusedAriaColindex,
  loadingEventIds,
  onRowSelected,
  refetch,
  onRuleChange,
  rowRenderers,
  ariaRowindex,
  selectedEventIds,
  showCheckboxes,
  timelineId,
}) => {
  const trGroupRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();
  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const expandedEvent = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).expandedEvent
  );

  const isExpanded = useMemo(() => expandedEvent && expandedEvent.eventId === event._id, [
    event._id,
    expandedEvent,
  ]);

  const onToggleShowNotes = useCallback(() => {
    const eventId = event._id;

    setShowNotes((prevShowNotes) => {
      if (prevShowNotes[eventId]) {
        // notes are closing, so focus the notes button on the next tick, after escaping the EuiFocusTrap
        setTimeout(() => {
          const notesButtonElement = trGroupRef.current?.querySelector<HTMLButtonElement>(
            `.${NOTES_BUTTON_CLASS_NAME}`
          );
          notesButtonElement?.focus();
        }, 0);
      }

      return { ...prevShowNotes, [eventId]: !prevShowNotes[eventId] };
    });
  }, [event]);

  const onPinEvent: OnPinEvent = useCallback(
    (eventId) => dispatch(timelineActions.pinEvent({ id: timelineId, eventId })),
    [dispatch, timelineId]
  );

  const onUnPinEvent: OnPinEvent = useCallback(
    (eventId) => dispatch(timelineActions.unPinEvent({ id: timelineId, eventId })),
    [dispatch, timelineId]
  );

  const handleOnEventToggled = useCallback(() => {
    const eventId = event._id;
    const indexName = event._index!;

    dispatch(
      timelineActions.toggleExpandedEvent({
        timelineId,
        event: {
          eventId,
          indexName,
        },
      })
    );

    if (timelineId === TimelineId.active) {
      activeTimeline.toggleExpandedEvent({ eventId, indexName });
    }
  }, [dispatch, event._id, event._index, timelineId]);

  const associateNote = useCallback(
    (noteId: string) => {
      dispatch(timelineActions.addNoteToEvent({ eventId: event._id, id: timelineId, noteId }));
      if (!isEventPinned) {
        onPinEvent(event._id); // pin the event, because it has notes
      }
    },
    [dispatch, event, isEventPinned, onPinEvent, timelineId]
  );

  const RowRendererContent = useMemo(
    () => (
      <EventsTrSupplement>
        <StatefulRowRenderer
          ariaRowindex={ariaRowindex}
          browserFields={browserFields}
          containerRef={containerRef}
          event={event}
          lastFocusedAriaColindex={lastFocusedAriaColindex}
          rowRenderers={rowRenderers}
          timelineId={timelineId}
        />
      </EventsTrSupplement>
    ),
    [
      ariaRowindex,
      browserFields,
      containerRef,
      event,
      lastFocusedAriaColindex,
      rowRenderers,
      timelineId,
    ]
  );

  return (
    <EventsTrGroup
      $ariaRowindex={ariaRowindex}
      className={STATEFUL_EVENT_CSS_CLASS_NAME}
      data-test-subj="event"
      eventType={getEventType(event.ecs)}
      isBuildingBlockType={isEventBuildingBlockType(event.ecs)}
      isExpanded={isExpanded}
      ref={trGroupRef}
      showLeftBorder={!isEventViewer}
    >
      <EventColumnView
        id={event._id}
        actionsColumnWidth={actionsColumnWidth}
        ariaRowindex={ariaRowindex}
        columnHeaders={columnHeaders}
        columnRenderers={columnRenderers}
        data={event.data}
        ecsData={event.ecs}
        eventIdToNoteIds={eventIdToNoteIds}
        expanded={isExpanded}
        isEventPinned={isEventPinned}
        isEventViewer={isEventViewer}
        loadingEventIds={loadingEventIds}
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
      />

      <EventsTrSupplementContainerWrapper>
        <EventsTrSupplement
          className="siemEventsTable__trSupplement--notes"
          data-test-subj="event-notes-flex-item"
        >
          <NoteCards
            ariaRowindex={ariaRowindex}
            associateNote={associateNote}
            data-test-subj="note-cards"
            noteIds={eventIdToNoteIds[event._id] || emptyNotes}
            showAddNote={!!showNotes[event._id]}
            toggleShowAddNote={onToggleShowNotes}
          />
        </EventsTrSupplement>

        {RowRendererContent}
      </EventsTrSupplementContainerWrapper>
    </EventsTrGroup>
  );
};

export const StatefulEvent = React.memo(StatefulEventComponent);
